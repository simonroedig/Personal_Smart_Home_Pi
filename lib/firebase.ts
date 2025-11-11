import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (server-side only)
let db: Firestore;

function initFirebase() {
  if (getApps().length === 0) {
    // For Vercel, you'll store the service account JSON as an environment variable
    // FIREBASE_SERVICE_ACCOUNT (stringified JSON)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'simonssmarthome',
    });
  }

  return getFirestore();
}

export function getDb(): Firestore {
  if (!db) {
    db = initFirebase();
  }
  return db;
}

// Camera state type
export type CameraState = "on" | "off";

// Document structure in Firestore
export interface CameraStateDoc {
  camera: CameraState;
  updatedAt: string; // Format: DD-MM-YYYY_HH-MM-SS_unixTimestamp
}

// Collection and document references
export const CAMERA_COLLECTION = 'camera';
export const CAMERA_DOC_ID = 'state';

/**
 * Get the current camera state from Firestore
 */
export async function getCameraState(): Promise<CameraState> {
  const db = getDb();
  const docRef = db.collection(CAMERA_COLLECTION).doc(CAMERA_DOC_ID);
  const doc = await docRef.get();

  if (!doc.exists) {
    // Initialize with default state if it doesn't exist
    await setCameraState('off');
    return 'off';
  }

  const data = doc.data() as CameraStateDoc;
  return data.camera || 'off';
}

/**
 * Format timestamp as DD-MM-YYYY_HH-MM-SS_unixTimestamp
 * Example: 11-11-2025_20-17-53_1731353873000
 * Uses Europe/Berlin timezone (CET/CEST)
 */
function formatReadableTimestamp(unixTimestamp: number): string {
  const date = new Date(unixTimestamp);
  
  // Convert to Europe/Berlin timezone (Germany)
  const formatter = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hours = get('hour');
  const minutes = get('minute');
  const seconds = get('second');
  
  return `${day}-${month}-${year}_${hours}-${minutes}-${seconds}_${unixTimestamp}`;
}

/**
 * Set the camera state in Firestore
 */
export async function setCameraState(state: CameraState): Promise<CameraStateDoc> {
  const db = getDb();
  const docRef = db.collection(CAMERA_COLLECTION).doc(CAMERA_DOC_ID);
  
  const now = Date.now();
  const stateDoc: CameraStateDoc = {
    camera: state,
    updatedAt: formatReadableTimestamp(now),
  };

  await docRef.set(stateDoc);
  return stateDoc;
}
