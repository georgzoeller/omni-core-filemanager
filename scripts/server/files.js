const script = {
  name: 'files',

  exec: async function (ctx, payload) {

    let limit = payload.limit || 50
    let cursor = payload.cursor || undefined


    console.log('files', payload, limit, cursor)

    let images =  ctx.app.cdn.kvStorage.getAny('file.',undefined,{limit,cursor}).map((file) => {
      return {...file.value, seq: file.seq}
    })


    return {
      images
    }
  }

}

export default script
