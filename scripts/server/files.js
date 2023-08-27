const script = {
  name: 'files',

  exec: async function (ctx, payload) {

    let limit = payload.limit || 50
    let cursor = payload.cursor || undefined


    let tags = 'user.' + ctx.user.id
    let images =  ctx.app.cdn.kvStorage.getAny('file.',undefined,{limit,cursor, tags}).map((file) => {

      if (file.value.fid)
      {
        file.value.url = '/fid/' + file.value.fid
      }
      return {...file.value, seq: file.seq}
    })


    return {
      images
    }
  }

}

export default script
