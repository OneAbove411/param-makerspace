export function useIsPast(date: string) {
    return new Date(date) < new Date();
}
