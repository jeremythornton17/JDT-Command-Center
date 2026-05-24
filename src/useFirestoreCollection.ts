import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export function useFirestoreSyncState<T extends { id: string }>(collectionName: string, _initialData: T[], enabled: boolean = true) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setData(fetchedData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, collectionName);
    });

    return () => unsubscribe();
  }, [collectionName, enabled]);

  const customSetData = (action: T[] | ((prev: T[]) => T[])) => {
    setData((prev) => {
      const nextData = typeof action === 'function' ? (action as Function)(prev) : action;
      
      const prevMap = new Map(prev.map(item => [item.id, item]));
      const nextMap = new Map(nextData.map((item: T) => [item.id, item]));

      // Identify changes and save them
      const batch = writeBatch(db);
      
      nextData.forEach((item: T) => {
        const prevItem = prevMap.get(item.id);
        if (JSON.stringify(prevItem) !== JSON.stringify(item)) {
           const docRef = doc(db, collectionName, item.id);
           batch.set(docRef, item);
        }
      });

      prev.forEach(item => {
        if (!nextMap.has(item.id)) {
           const docRef = doc(db, collectionName, item.id);
           batch.delete(docRef);
        }
      });

      batch.commit().catch(err => {
         handleFirestoreError(err, OperationType.WRITE, collectionName);
      });

      return nextData;
    });
  };

  return [data, customSetData] as const;
}
