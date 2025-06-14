import { db, storage } from "./firebase";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

export interface PodcastData {
  id?: string;
  userId: string;
  title: string;
  topic: string;
  personality1: string;
  personality2: string;
  script: string;
  audioUrl?: string;
  createdAt?: any;
}

export const savePodcast = async (podcastData: PodcastData, audioBase64?: string): Promise<string> => {
  try {
    // Add timestamp
    const podcastWithTimestamp = {
      ...podcastData,
      createdAt: serverTimestamp(),
    };

    // Save podcast metadata to Firestore
    const docRef = await addDoc(collection(db, "podcasts"), podcastWithTimestamp);
    
    // If audio data is provided, save it to Storage
    if (audioBase64) {
      const storageRef = ref(storage, `podcasts/${podcastData.userId}/${docRef.id}`);
      await uploadString(storageRef, audioBase64, 'data_url');
      const audioUrl = await getDownloadURL(storageRef);
      
      // Update the document with the audio URL
      await updateDoc(doc(db, "podcasts", docRef.id), {
        audioUrl
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error saving podcast:", error);
    throw error;
  }
};

export const getUserPodcasts = async (userId: string): Promise<PodcastData[]> => {
  try {
    const q = query(
      collection(db, "podcasts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const podcasts: PodcastData[] = [];

    querySnapshot.forEach((doc) => {
      podcasts.push({
        id: doc.id,
        ...doc.data() as PodcastData
      });
    });

    return podcasts;
  } catch (error) {
    console.error("Error getting user podcasts:", error);
    throw error;
  }
};

export const deletePodcast = async (podcastId: string, userId: string): Promise<void> => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, "podcasts", podcastId));
    
    // Delete from Storage if exists
    try {
      const storageRef = ref(storage, `podcasts/${userId}/${podcastId}`);
      await deleteObject(storageRef);
    } catch (error) {
      console.log("No audio file to delete or error deleting:", error);
    }
  } catch (error) {
    console.error("Error deleting podcast:", error);
    throw error;
  }
};