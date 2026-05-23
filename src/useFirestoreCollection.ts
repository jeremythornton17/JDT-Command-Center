import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export function useFirestoreSyncState<T extends { id: string }>(collectionName: string, initialData: T[], enabled: boolean = true) {
  const [data, setData] = useState<T[]>(initialData);
  const seeded = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      if (fetchedData.length === 0 && initialData.length > 0 && !seeded.current) {
        seeded.current = true;
        setData(initialData);
        // Seed database
        const batch = writeBatch(db);
        initialData.forEach(item => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, item);
        });
        batch.commit().catch(err => console.error("Seed error:", err));
      } else {
        setData(fetchedData);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, collectionName);
    });

    return () => unsubscribe();
  }, [collectionName]);

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
