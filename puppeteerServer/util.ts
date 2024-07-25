export function match(string:string, subStrings:string[]) {
    for (const subString of subStrings) {
        if (string.includes(subString)) return true
    }
    return false
}