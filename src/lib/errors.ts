/** Erreur destinée à être affichée telle quelle à l'utilisateur. */
export class UserFacingError extends Error {
  override name = 'UserFacingError'
}

/** « Impossible d’ajouter… » / « Impossible de lire… » */
function impossible(action: string): string {
  return /^[aeiouyhéèêâ]/i.test(action) ? `Impossible d’${action}` : `Impossible de ${action}`
}

/** Transforme une erreur technique (IndexedDB, quota…) en message compréhensible. */
export function describeStorageError(error: unknown, action: string): UserFacingError {
  if (error instanceof UserFacingError) return error
  // DOMException n'hérite pas toujours d'Error : on lit le nom directement.
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
  if (name === 'QuotaExceededError') {
    return new UserFacingError(`${impossible(action)} : l’espace de stockage de l’appareil est plein.`)
  }
  if (name === 'MissingAPIError' || name === 'InvalidStateError') {
    return new UserFacingError(
      `${impossible(action)} : ce navigateur bloque le stockage local (navigation privée ?). Vos données ne peuvent pas être enregistrées.`,
    )
  }
  return new UserFacingError(`${impossible(action)}. Réessayez ; si le problème continue, rechargez la page.`)
}

export async function withStorage<T>(action: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(error)
    throw describeStorageError(error, action)
  }
}
