const cloud = require('wx-server-sdk')
const { COLLECTION } = require('../constants/collection')

function getDb() {
  return cloud.database()
}

async function updateBatch(batchId, data) {
  await getDb()
    .collection(COLLECTION)
    .doc(batchId)
    .update({
      data: {
        ...data,
        updatedAt: Date.now(),
      },
    })
}

async function failBatch(batchId, message, extra = {}) {
  try {
    await updateBatch(batchId, {
      status: 'failed',
      errorMessage: message,
      ...extra,
    })
  } catch (err) {
    console.warn('[process-recognition-batch] failBatch 写库失败', err)
  }
}

module.exports = { updateBatch, failBatch }
