const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const CONTACT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_CONTACTS = 12;
const MAX_PARAGRAPHS = 80;
const MAX_PARAGRAPH_LENGTH = 8000;
const DEFAULT_PORTRAIT = 'assets/stelle-id.png';

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error(`${label}必须是对象。`);
  }
  return value;
}

function text(value, label, maximum, fallback = '') {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new Error(`${label}必须是文字。`);
  if ([...value].length > maximum) throw new Error(`${label}最多 ${maximum} 个字符，请精简。`);
  if (value.includes('\0')) throw new Error(`${label}不能含有空字符。`);
  return value;
}

function paragraph(value, label) {
  if (value === undefined) return '';
  if (typeof value === 'string') return text(value, label, MAX_PARAGRAPH_LENGTH);
  if (!Array.isArray(value) || value.length > MAX_PARAGRAPHS) {
    throw new Error(`${label}必须是文字或最多 ${MAX_PARAGRAPHS} 段的文字数组。`);
  }
  const result = value.map((item) => {
    if (typeof item !== 'string') throw new Error(`${label}的每一段都必须是文字。`);
    return text(item, label, MAX_PARAGRAPH_LENGTH);
  });
  if ([...result.join('\n')].length > MAX_PARAGRAPH_LENGTH) {
    throw new Error(`${label}总共最多 ${MAX_PARAGRAPH_LENGTH} 个字符，请精简。`);
  }
  return result;
}

function legacyParagraphs(source, fields, label) {
  const result = fields.flatMap(([key, prefix]) => {
    const value = paragraph(source[key], key);
    return (Array.isArray(value) ? value : [value])
      .filter((item) => item.trim())
      .map((item) => prefix ? `${prefix}：${item}` : item);
  });
  return result.length ? paragraph(result, label) : '';
}

function qrPath(value, label) {
  if (value === undefined || value === null || value === '') return null;
  return text(value, label, 1024);
}

function contact(source, id) {
  record(source, '联系方式');
  const qrImage = qrPath(source.qr_image, '二维码路径');
  if (source.show_qr !== undefined && typeof source.show_qr !== 'boolean') {
    throw new Error('二维码显示设置必须为 true 或 false。');
  }
  return {
    id,
    platform: text(source.platform, '联系平台', 100),
    account: text(source.account, '联系账号', 200),
    note: text(source.note, '联系备注', 500),
    show_qr: source.show_qr ?? Boolean(qrImage),
    qr_image: qrImage,
  };
}

function contacts(source) {
  if (!Array.isArray(source) || source.length > MAX_CONTACTS) {
    throw new Error(`联系方式必须是数组，最多 ${MAX_CONTACTS} 项。`);
  }
  const reserved = new Set();
  for (const item of source) {
    record(item, '联系方式');
    if (!has(item, 'id')) continue;
    contactImageKey(item.id);
    if (reserved.has(item.id)) throw new Error(`联系方式 id 重复：${item.id}。`);
    reserved.add(item.id);
  }
  let next = 1;
  return source.map((item) => {
    let id = item.id;
    if (!has(item, 'id')) {
      while (reserved.has(`contact-${next}`)) next += 1;
      id = `contact-${next++}`;
      reserved.add(id);
    }
    return contact(item, id);
  });
}

function legacyContacts(source) {
  const result = [];
  const oldContact = contact({
    platform: source.contact_platform,
    account: source.contact,
    note: source.contact_note,
    show_qr: source.show_qr,
    qr_image: source.qr_image,
  }, 'legacy');
  if ([oldContact.platform, oldContact.account, oldContact.note].some((item) => item.trim())
      || oldContact.show_qr || oldContact.qr_image) result.push(oldContact);
  const uid = text(source.uid, '游戏 UID', 60);
  if (uid.trim()) result.push(contact({ platform: '游戏 UID', account: uid }, 'legacy-uid'));
  return result;
}

/** Normalize a new profile or migrate legacy fields without mutating the source. */
export function normalizeStripProfile(source) {
  record(source, '资料内容');
  const nickname = text(source.nickname, '昵称', 24);
  if (!nickname.trim()) throw new Error('昵称请填写 1–24 个字符。');
  const portrait = text(source.portrait, '头像路径', 1024, DEFAULT_PORTRAIT);
  if (!portrait.trim()) throw new Error('头像路径不能为空。');
  return {
    nickname,
    about_me: has(source, 'about_me') ? paragraph(source.about_me, '关于我')
      : legacyParagraphs(source, [['intro', ''], ['location', '常驻']], '关于我'),
    tagline: text(source.tagline, '页首短句', 200),
    fandoms: paragraph(source.fandoms, '坑'),
    favorites: paragraph(source.favorites, '我推'),
    boundaries: paragraph(source.boundaries, 'NG'),
    other: has(source, 'other') ? paragraph(source.other, '其他') : legacyParagraphs(source, [
      ['interests', '兴趣'], ['looking_for', '想扩'], ['cp', 'CP 偏好'],
      ['preferences', '相处习惯'], ['event', '相遇'], ['message', '留言'],
    ], '其他'),
    closing: text(source.closing, '结语', 300),
    portrait,
    contacts: has(source, 'contacts') ? contacts(source.contacts) : legacyContacts(source),
  };
}

/** IDs are also used in upload keys and virtual filenames, so never accept paths. */
export function contactImageKey(id) {
  if (typeof id !== 'string' || !CONTACT_ID.test(id)) {
    throw new Error('联系方式 id 须为 1–64 位字母、数字、下划线或短横线。');
  }
  return `contact-${id}`;
}

/** Works during editing too: invalid/empty nickname does not prevent image cleanup. */
export function stripImageKeys(profile) {
  record(profile, '资料内容');
  const entries = has(profile, 'contacts') ? profile.contacts : [];
  if (!Array.isArray(entries) || entries.length > MAX_CONTACTS) {
    throw new Error(`联系方式必须是数组，最多 ${MAX_CONTACTS} 项。`);
  }
  const keys = entries.map((item) => contactImageKey(record(item, '联系方式').id));
  if (new Set(keys).size !== keys.length) throw new Error('联系方式 id 不能重复。');
  return ['portrait', ...keys];
}

/** Migrate saved image keys; stale images for removed contacts are intentionally omitted. */
export function migrateStripDraft(source, sourceImages = {}) {
  const profile = normalizeStripProfile(source);
  record(sourceImages, '资料图片');
  const legacyImage = !has(source, 'contacts') && has(sourceImages, 'qr_image')
    ? sourceImages.qr_image : undefined;
  if (legacyImage != null) {
    let entry = profile.contacts.find((item) => item.id === 'legacy');
    if (!entry) {
      entry = contact({}, 'legacy');
      profile.contacts.unshift(entry);
    }
    if (!has(source, 'show_qr')) entry.show_qr = true;
  }
  const images = {};
  for (const key of stripImageKeys(profile)) {
    const image = has(sourceImages, key) ? sourceImages[key]
      : key === contactImageKey('legacy') ? legacyImage : undefined;
    if (image !== undefined) images[key] = structuredClone(image);
  }
  return { profile, images };
}
