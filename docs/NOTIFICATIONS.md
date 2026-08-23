# AssetHub Notifications

## Goal

Provide a simple, useful notification layer for Tenant and System users without creating a complicated workflow engine.

## Notification types

Notifications should cover meaningful product events such as:

- security/access events;
- tenant lifecycle events;
- subscription/license events;
- asset workflow events;
- identity/SCIM events;
- system operational warnings.

## User preferences

Settings should allow a user to choose which supported notification categories they receive. Preferences should remain simple and understandable.

## Delivery model

The initial product model is in-app notification delivery with clear read/unread state. Additional channels can be added later without changing the event taxonomy.

## Deduplication

Repeated identical events should be deduplicated using a stable event/category/entity key and a bounded deduplication window where appropriate. The deduplication migration is part of the PostgreSQL implementation baseline.

## Read state

Supported interactions:

- unread count;
- list recent notifications;
- mark one as read;
- mark relevant notifications as read.

## Error handling

Notification delivery must not cause the primary business mutation to fail unless the notification is itself a mandatory transactional requirement. Notification errors should be logged and observable separately.

## Security

Never place passwords, session tokens, SCIM secrets or private keys into notification payloads. Sensitive information should be summarized safely.
