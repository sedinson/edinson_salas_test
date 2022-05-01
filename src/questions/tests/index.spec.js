const { pointIntersects, compareStrings } = require("../src/index");

describe("Call pointIntersects()", () => {
    it("[5, 10], [2, 12] should intersects", () => {
        const result = pointIntersects([5, 10], [2, 12]);
        expect(result).toBeTruthy();
    });

    it("[2, 10], [5, 12] should intersects", () => {
        const result = pointIntersects([2, 10], [5, 12]);
        expect(result).toBeTruthy();
    });

    it("[5, 12], [2, 10] should intersects", () => {
        const result = pointIntersects([5, 12], [2, 10]);
        expect(result).toBeTruthy();
    });

    it("[2, 12], [5, 10] should intersects", () => {
        const result = pointIntersects([2, 12], [5, 10]);
        expect(result).toBeTruthy();
    });

    it("[2, 10], [12, 20] should not intersects", () => {
        const result = pointIntersects([2, 10], [12, 20]);
        expect(result).toBeFalsy();
    });

    it("[12, 20], [2, 10] should not intersects", () => {
        const result = pointIntersects([12, 20], [2, 10]);
        expect(result).toBeFalsy();
    });
});

describe("Call compareStrings()", () => {
    it("'0.1' should be lower than '1.0'", () => {
        const result = compareStrings("0.1", "1.0");
        expect(result).toBe("lower than");
    });

    it("'1.0' should be equals to '1.0'", () => {
        const result = compareStrings("1.0", "1.0");
        expect(result).toBe("equals");
    });

    it("'2.1' should be greater than '1.9'", () => {
        const result = compareStrings("1.1", "0.9");
        expect(result).toBe("greater than");
    });

    it("123 should throw an error", () => {
        expect(() => {
            compareStrings(123, "123");
        }).toThrow();
    });
});