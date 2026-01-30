
const DB_BASE_URL = "https://bhim-dairy-default-rtdb.firebaseio.com";

export const getItems = async <T,>(path: string): Promise<T[]> => {
  try {
    const response = await fetch(`${DB_BASE_URL}/${path}.json`);
    const data = await response.json();
    if (!data) return [];
    return Object.entries(data).map(([id, val]) => ({ id, ...(val as any) }));
  } catch (error) {
    console.error(`Firebase Get Error (${path}):`, error);
    return [];
  }
};

export const addItem = async (path: string, data: any) => {
  try {
    const response = await fetch(`${DB_BASE_URL}/${path}.json`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return result.name; // Firebase returns the unique ID in the 'name' field
  } catch (error) {
    console.error(`Firebase Add Error (${path}):`, error);
    throw error;
  }
};

export const updateItem = async (path: string, id: string, data: any) => {
  try {
    await fetch(`${DB_BASE_URL}/${path}/${id}.json`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(`Firebase Update Error (${path}):`, error);
    throw error;
  }
};

export const removeItem = async (path: string, id: string) => {
  try {
    await fetch(`${DB_BASE_URL}/${path}/${id}.json`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error(`Firebase Delete Error (${path}):`, error);
    throw error;
  }
};

export const findMemberByMobile = async (mobile: string) => {
  const members = await getItems<any>('members');
  return members.find(m => m.mobile === mobile) || null;
};
