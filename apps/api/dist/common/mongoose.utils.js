"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDto = toDto;
exports.toDtoArray = toDtoArray;
function toDto(doc) {
    if (!doc)
        return null;
    const { _id, ...rest } = doc;
    return { id: String(_id), ...rest };
}
function toDtoArray(docs) {
    return docs.map((doc) => toDto(doc));
}
//# sourceMappingURL=mongoose.utils.js.map