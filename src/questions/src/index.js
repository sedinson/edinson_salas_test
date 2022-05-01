/**
 * Method to identify if 2 points intersects (only in the same axis)
 * @param {point} point1 a point
 * @param {point} point2 a point
 * @returns {boolean} true if intersects, otherwise false
 */
module.exports.pointIntersects = ([x1, x2], [x3, x4]) => x1 <= x4 && x2 >= x3;

/**
 * Method to validate if the string 1 is lower, equals or greater than a string 2
 * @param {String} str1 the origin string
 * @param {String} str2 the compared string
 * @returns {String} lower than, equals or greater than
 * @throws {Error} error if str1 or str2 is not an string
 */
module.exports.compareStrings = (str1, str2) => {
    if(typeof str1 !== "string" || typeof str2 !== "string") {
        throw new Error("invalid");
    }

    return {
        "-1": "lower than",
        "0": "equals",
        "1": "greater than"
    }[str1.localeCompare(str2)];
};