import {generateCode} from '../../bin/firebase_testing';

describe('tests for generateCode', () => {
    test('generates a string code', async() => {
        const number = generateCode();
        // asserts that the number should be a string code of #s
        await expect(typeof number).toBe("string");
    });

    test('generates a 6-letter code', async() => {
        const number = generateCode();
        // asserts that the length of the code is 6
        await expect(number.length).toBe(6);
    });
})