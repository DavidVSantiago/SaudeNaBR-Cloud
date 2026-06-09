/** Faz validação básica do payload */
export function dataValidation(splitedPayload: string[]): [boolean, string] {
    if (splitedPayload.length !== 5) return [true, "Payload deve posssuir 5 parâmetros!"]
    if (isNaN(Number(splitedPayload[0])) ||
        isNaN(Number(splitedPayload[2])) ||
        isNaN(Number(splitedPayload[3])) ||
        isNaN(Number(splitedPayload[4]))) {
        return [true, "Payload com dados inválidos (NaN)"]
    }
    return [false, ""]
}
