const script = {
  name: 'files',

  exec: async function (ctx, payload) {

    let limit = payload.pageSize || 50
    let cursor = payload.cursor || undefined




    let images =  ctx.app.cdn.kvStorage.getAny('file.',undefined,{limit,cursor}).map((file) => { return file.value})


    return {
      images
    }
  }

}

export default script
