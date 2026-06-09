const cloud = require('wx-server-sdk')

const db = cloud.database()
const _ = db.command

async function upsertClothingType(openid, typeName) {
  const coll = db.collection('clothing_types')
  const { data } = await coll.where({ _openid: openid, name: typeName }).limit(1).get()
  const now = db.serverDate()

  if (data.length > 0) {
    const typeDoc = data[0]
    await coll.doc(typeDoc._id).update({
      data: {
        itemCount: _.inc(1),
        updatedAt: now,
      },
    })
    return {
      type: {
        _id: typeDoc._id,
        name: typeDoc.name,
        itemCount: (typeDoc.itemCount || 0) + 1,
      },
      isNewType: false,
    }
  }

  const addRes = await coll.add({
    data: {
      _openid: openid,
      name: typeName,
      itemCount: 1,
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    type: { _id: addRes._id, name: typeName, itemCount: 1 },
    isNewType: true,
  }
}

async function saveRecognizedItem(openid, fileID, recognized) {
  const { type, isNewType } = await upsertClothingType(openid, recognized.typeName)
  const now = db.serverDate()

  const itemRes = await db.collection('wardrobe_items').add({
    data: {
      _openid: openid,
      name: recognized.name,
      typeId: type._id,
      typeName: recognized.typeName,
      imageFileId: fileID,
      tags: recognized.tags,
      createdAt: now,
    },
  })

  return {
    item: {
      _id: itemRes._id,
      name: recognized.name,
      typeId: type._id,
      typeName: recognized.typeName,
      imageFileId: fileID,
      tags: recognized.tags,
      createdAt: Date.now(),
    },
    type,
    isNewType,
  }
}

module.exports = {
  upsertClothingType,
  saveRecognizedItem,
}
