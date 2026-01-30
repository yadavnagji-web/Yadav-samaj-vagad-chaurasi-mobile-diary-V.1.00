
export interface Village {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  name: string;
  fatherName: string;
  mobile: string;
  villageId: string;
  villageName: string;
  updatedAt: number;
  deviceHash?: string;
}

export interface Bulletin {
  id: string;
  content: string;
  active: boolean;
  createdAt: number;
}

export enum UserView {
  HOME = 'HOME',
  REGISTER = 'REGISTER',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  GUIDE = 'GUIDE',
  ADMIN = 'ADMIN'
}
