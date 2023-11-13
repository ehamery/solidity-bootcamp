import fs from 'fs';

export type Proposal = [string, bigint] & {
    name: string;
    voteCount: bigint;
}

export function getPackageJson(): any {
    return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
}

export function parseIntBase10(value: any): number {
    return parseInt(value, 10);
}

export function commaSeparatedListToArray(list: string): Array<string> {
    console.debug('list:', list);
    const array = list.split(',');
    const { length } = array;
    for (let i = 0; i < length; i++) {
        array[i] = array[i].trim();
    }
    return array;
}

