const hash = require('eosjs-ecc/lib/hash');
const ByteBuffer = require('bytebuffer');

function calculateTracery(userId, permlink) {
    const hashBuff = hash.sha256(`${userId}/${permlink}`);
    const byteBuff = ByteBuffer.fromBinary(hashBuff.toString('binary'), ByteBuffer.LITTLE_ENDIAN);
    return byteBuff.readUint64().toString();
}

module.exports = {
    calculateTracery,
};
