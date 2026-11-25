export interface DeletedAccountConversation {
  id: string;
  type: 'direct' | 'group';
  remainingParticipantIds: string[];
}

export interface AccountDeletionNotice {
  userId: string;
  conversations: DeletedAccountConversation[];
}

type AccountDeletionHandler = (notice: AccountDeletionNotice) => void;

let handleAccountDeleted: AccountDeletionHandler = () => undefined;

export function setAccountDeletionHandler(handler: AccountDeletionHandler): void {
  handleAccountDeleted = handler;
}

export function notifyAccountDeleted(notice: AccountDeletionNotice): void {
  handleAccountDeleted(notice);
}
