function match(string, subStrings) {
    for (const subString of subStrings) {
        if (string.includes(subString)) return true
    }
    return false
}

module.exports = {
    match
}