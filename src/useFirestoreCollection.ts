import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  buildCollectionSyncOperations,
  resolveNextCollectionData,
  type CollectionDataAction,
  type CollectionRecord,
} from './firestoreSync';

export function useFirestoreSyncState<T extends CollectionRecord>(collectionName: string, _initialData: T[], enabled: boolean = true) {
  const [data, setData] = useState<T[]>([]);
  const dataRef = useRef<T[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      dataRef.current = fetchedData;
      setData(fetchedData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, collectionName);
    });

    return () => unsubscribe();
  }, [collectionName, enabled]);

  const customSetData = useCallback(async (action: CollectionDataAction<T>): Promise<boolean> => {
    const prevData = dataRef.current;
    const nextData = resolveNextCollectionData(prevData, action);
    const operations = buildCollectionSyncOperations(collectionName, prevData, nextData, serverTimestamp());

    dataRef.current = nextData;
    setData(nextData);

    if (operations.length === 0) return true;

    const batch = writeBatch(db);
    for (const operation of operations) {
      const docRef = doc(db, operation.collectionName, operation.id);
      if (operation.type === 'set') {
        batch.set(docRef, operation.data, { merge: true });
      } else {
        batch.delete(docRef);
      }
    }

    try {
      await batch.commit();
      return true;
    } catch (err) {
      dataRef.current = prevData;
      setData(prevData);
      handleFirestoreError(err, OperationType.WRITE, collectionName);
      return false;
    }
  }, [collectionName]);

  return [data, customSetData] as const;
}
