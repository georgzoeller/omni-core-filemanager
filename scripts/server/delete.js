
const script = {
  name: 'delete',

  exec: async function (ctx, payload) {


    console.log('delete', payload)

    if (payload == null) {
        return {ok: false , reason: 'No payload'};
    }

    if (payload.delete == null){
      return {ok: false, reason: 'No delete property'};
    }

    if (!Array.isArray(payload.delete)){
      return {ok: false, reason: 'Not an array'};
    }



    await Promise.all(payload.delete.map(fid=> {
      console.log('softDelete')
      ctx.app.cdn.softDelete(fid)
    }))

    return {
      deleted: payload.delete
    }
  }

}

export default script
