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
  updatedAt: number;
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
 * Set the camera state in Firestore
 */
export async function setCameraState(state: CameraState): Promise<CameraStateDoc> {
  const db = getDb();
  const docRef = db.collection(CAMERA_COLLECTION).doc(CAMERA_DOC_ID);
  
  const stateDoc: CameraStateDoc = {
    camera: state,
    updatedAt: Date.now(),
  };

  await docRef.set(stateDoc);
  return stateDoc;
}
