export const seededOperationsCrew: any[] = [];

export function shouldSeedCollection(collectionName: string, initialData: { id: string }[]): boolean {
  if (collectionName === "crews") return false;
  return initialData.length > 0;
}
