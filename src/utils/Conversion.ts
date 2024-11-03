// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
export default BigInt.prototype.toJSON = function () {
    return this.toString();
}
