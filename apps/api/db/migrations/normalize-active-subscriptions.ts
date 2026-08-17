import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const subscriptions = connection.collection('subscriptions');
    const groups = await subscriptions.aggregate([
      { $match: { status: { $in: ['active', 'trialing', 'past_due'] } } },
      { $group: { _id: '$tenantId', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();
    let normalized = 0;
    for (const group of groups) {
      const docs = await subscriptions.find({ _id: { $in: group.ids } }).sort({ createdAt: -1, _id: -1 }).toArray();
      const keep = docs.shift();
      if (!keep) continue;
      const revokeIds = docs.map((doc) => doc._id);
      if (revokeIds.length) {
        await subscriptions.updateMany({ _id: { $in: revokeIds } }, { $set: { status: 'revoked', endsAt: new Date(), graceUntil: null, updatedAt: new Date() } });
        normalized += revokeIds.length;
      }
    }
    console.log(`Normalized ${normalized} duplicate active subscriptions.`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
