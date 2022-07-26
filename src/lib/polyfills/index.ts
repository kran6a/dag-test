export default async ()=>{
    if (!global.crypto) {
        // @ts-ignore
        global["crypto"] = {subtle: (await import('node:crypto')).subtle};
    }
}