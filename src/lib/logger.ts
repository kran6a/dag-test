const silenced: Set<string> = new Set<string>();
export const log = (source: string, level: 'INFO' | 'WARN' | 'ERROR', data: string)=>{
    if (silenced.has(source) || silenced.has(level))
        return;
    console.info(`[${source}][${level}]: ${data}`);
}
export const silence = (...sources: string[]): void=>sources.forEach(source=>silenced.add(source));
export const unsilence = (...sources: string[]): void=>sources.forEach(source=>silenced.delete(source));
//export const log = (source: string, data: string)=>{};