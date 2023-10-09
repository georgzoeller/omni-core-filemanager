const script = {
  name: 'files',

  exec: async function (ctx, payload) {

    console.log("-----files", payload)
    let limit = payload.limit || 50
    let cursor = payload.cursor || undefined
    let expiryType = payload.expiryType

    let tags = 'user.' + ctx.user.id
    let files =  ctx.app.cdn.kvStorage.getAny('file.',undefined,{limit,cursor, expiryType, tags}).map((file) => {

      if (file.value.fid)
      {
        file.value.url = '/fid/' + file.value.fid
      }
      if (file.value.expires >= Number.MAX_SAFE_INTEGER)
      {
        delete file.value.expires
      }

      return {...file.value, seq: file.seq}
    })

    console.log(files)
    return {
      images:files
    }
  }

}

export default script
