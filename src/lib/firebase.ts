import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { MENU_ITEMS } from '../data/menu';
import type {
  ActiveOrder,
  DietaryMode,
  FoodCategory,
  OrderStepIndex,
  TasteProfile,
} from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

export function subscribeTasteProfile(
  userId: string,
  onData: (profile: TasteProfile | null) => void
): Unsubscribe {
  const docPath = `users/${userId}/profile/preferences`;
  const ref = doc(db, 'users', userId, 'profile', 'preferences');

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      const dietaryMode: DietaryMode = data.dietaryMode === 'veg' ? 'veg' : 'all';
      const rawCats = Array.isArray(data.favoriteCategories)
        ? data.favoriteCategories
        : [];
      const validCats = rawCats.filter(
        (c): c is Exclude<FoodCategory, 'All'> =>
          c === 'North Indian' ||
          c === 'Pizza & Burgers' ||
          c === 'Rice & Breads' ||
          c === 'Beverages & Desserts'
      );
      onData({
        dietaryMode,
        favoriteCategories: validCats.slice(0, 4),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  );
}

export async function saveTasteProfile(
  userId: string,
  profile: TasteProfile
): Promise<void> {
  const docPath = `users/${userId}/profile/preferences`;
  const ref = doc(db, 'users', userId, 'profile', 'preferences');

  try {
    const existingSnap = await getDoc(ref);
    const sanitizedCats = profile.favoriteCategories.slice(0, 4);

    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ownerId: userId,
        dietaryMode: profile.dietaryMode,
        favoriteCategories: sanitizedCats,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        dietaryMode: profile.dietaryMode,
        favoriteCategories: sanitizedCats,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function saveOrderToFirestore(
  userId: string,
  order: ActiveOrder
): Promise<string> {
  const cleanDocId = order.orderId.replace(/[^a-zA-Z0-9_-]/g, '');
  const docPath = `users/${userId}/orders/${cleanDocId}`;
  const ref = doc(db, 'users', userId, 'orders', cleanDocId);

  const boundedItems = order.items.slice(0, 30);
  const itemIds = boundedItems.map((entry) => entry.item.id.slice(0, 64));
  const itemQuantities = boundedItems.map((entry) =>
    Math.min(99, Math.max(1, Math.round(entry.quantity)))
  );

  try {
    const payload: Record<string, unknown> = {
      ownerId: userId,
      orderId: order.orderId.slice(0, 32),
      grandTotal: Number(order.grandTotal),
      longestPrepMins: Number(order.longestPrepMins),
      deliveryMins: Number(order.deliveryMins),
      estimatedTotalMins: Number(order.estimatedTotalMins),
      statusIndex: Math.min(3, Math.max(0, Math.round(order.statusIndex))),
      placedAt: order.placedAt.slice(0, 32),
      placedDate: (order.placedDate ?? '').slice(0, 32) || 'Today',
      customerName: order.customer.name.trim().slice(0, 120),
      customerPhone: order.customer.phone.trim().slice(0, 24),
      customerAddress: order.customer.address.trim().slice(0, 500),
      itemIds,
      itemQuantities,
      otpEnabled: Boolean(order.otpEnabled),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (order.otpEnabled && order.orderOtp && /^[0-9]{4}$/.test(order.orderOtp)) {
      payload.orderOtp = order.orderOtp;
    }

    await setDoc(ref, payload);
    return cleanDocId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateOrderStatusInFirestore(
  userId: string,
  firestoreDocId: string,
  statusIndex: OrderStepIndex
): Promise<void> {
  const docPath = `users/${userId}/orders/${firestoreDocId}`;
  const ref = doc(db, 'users', userId, 'orders', firestoreDocId);

  try {
    await updateDoc(ref, {
      statusIndex,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export function subscribeUserOrders(
  userId: string,
  onData: (orders: ActiveOrder[]) => void
): Unsubscribe {
  const colPath = `users/${userId}/orders`;
  const q = query(
    collection(db, 'users', userId, 'orders'),
    where('ownerId', '==', userId),
    limit(20)
  );

  const menuById = new Map(MENU_ITEMS.map((m) => [m.id, m]));

  return onSnapshot(
    q,
    (snapshot) => {
      const ordersWithTime: { order: ActiveOrder; createdAtMs: number }[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const itemIds = Array.isArray(data.itemIds) ? data.itemIds : [];
        const itemQuantities = Array.isArray(data.itemQuantities)
          ? data.itemQuantities
          : [];

        const items = itemIds
          .map((id, idx) => {
            const found = menuById.get(String(id));
            if (!found) return null;
            const qty = Number(itemQuantities[idx]) || 1;
            return { item: found, quantity: qty };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        if (items.length === 0) return;

        const statusNum = Number(data.statusIndex);
        const statusIndex: OrderStepIndex =
          statusNum === 1 || statusNum === 2 || statusNum === 3 ? statusNum : 0;

        const createdAtMs =
          typeof data.createdAt?.toMillis === 'function'
            ? data.createdAt.toMillis()
            : 0;

        ordersWithTime.push({
          createdAtMs,
          order: {
            orderId: String(data.orderId ?? `#${docSnap.id}`),
            firestoreDocId: docSnap.id,
            items,
            grandTotal: Number(data.grandTotal ?? 0),
            customer: {
              name: String(data.customerName ?? ''),
              phone: String(data.customerPhone ?? ''),
              address: String(data.customerAddress ?? ''),
            },
            longestPrepMins: Number(data.longestPrepMins ?? 15),
            deliveryMins: Number(data.deliveryMins ?? 15),
            estimatedTotalMins: Number(data.estimatedTotalMins ?? 30),
            remainingSeconds: 0,
            statusIndex,
            placedAt: String(data.placedAt ?? ''),
            placedDate: String(data.placedDate ?? ''),
            otpEnabled: Boolean(data.otpEnabled),
            orderOtp:
              typeof data.orderOtp === 'string' && /^[0-9]{4}$/.test(data.orderOtp)
                ? data.orderOtp
                : undefined,
          },
        });
      });

      ordersWithTime.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(ordersWithTime.map((entry) => entry.order));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}
