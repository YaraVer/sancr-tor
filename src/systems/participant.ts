/** Код участника: нормализация кириллицы и проверка формата [A-Z][0-9]{3}. */

const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

export function normalizeParticipantCode(raw: string): string {
  let result = '';
  for (const char of raw.toLowerCase()) {
    if (/[a-z0-9]/.test(char)) {
      result += char.toUpperCase();
    } else if (LATIN[char] !== undefined) {
      result += LATIN[char].toUpperCase();
    }
  }
  return result.slice(0, 4);
}

export function isValidParticipantCode(code: string): boolean {
  return /^[A-Z][0-9]{3}$/.test(code);
}

let participantCode = '';

export function setParticipantCode(code: string): void {
  participantCode = code;
}

export function getParticipantCode(): string {
  return participantCode;
}

export function clearParticipantCode(): void {
  participantCode = '';
}
