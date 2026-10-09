/**
 * Demande au navigateur de ne pas effacer nos données automatiquement
 * (par exemple quand l'appareil manque de place). Le navigateur peut refuser.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export async function isStoragePersisted(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null
  return navigator.storage.persisted()
}
