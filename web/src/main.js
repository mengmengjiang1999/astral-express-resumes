import './style.css';
import { PDFDocument } from 'pdf-lib';
import { compileDocument } from './compiler.js';
import { normalizeStripProfile, contactImageKey, stripImageKeys, migrateStripDraft } from './strip-profile.js';

const $ = (selector) => document.querySelector(selector);
const clone = (value) => structuredClone(value);
const base = new URL(import.meta.env.BASE_URL, location.href);
const state = { kind: 'strip', theme: 'light', profiles: {}, images: { strip: {}, resume: {} }, revision: 0, result: null, busy: false, queued: false, timer: null, previewURL: null, uploads: { strip: {}, resume: {} } };
const presets = {};
const uploading = { strip: new Set(), resume: new Set() };
const maxContacts = 12;
const maxImageBytes = 20 * 1024 * 1024;
const imageKeys = (kind, profile = state.profiles[kind]) => kind === 'strip' ? stripImageKeys(profile) : ['portrait'];
const repeatFields = {
  facts: [['title', '标题'], ['en', '英文副标题'], ['body', '内容']],
  paths: [['title', '名称'], ['body', '描述', true]],
  skills: [['title', '能力名称'], ['subtitle', '关键词'], ['body', '说明', true]],
  projects: [['title', '项目名称'], ['tag', '地点 / 角色'], ['duty', '项目职责', true], ['outcome', '项目成果', true]],
};
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const textValue = (value) => Array.isArray(value) ? value.join('\n') : String(value ?? '');

function setStatus(message, tone = '') {
  $('#status').textContent = message;
  $('#status').className = `status ${tone}`;
}
function getPath(object, path) { return path.split('.').reduce((value, key) => value?.[key], object); }
function setPath(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((part, key) => part[key], object)[last] = value;
}
function field(path, label, { multiline = false, optional = false, hint = '', placeholder = '', max = 4000 } = {}) {
  const value = escapeHTML(textValue(getPath(state.profiles[state.kind], path)));
  const attributes = `data-path="${path}" id="field-${path}" maxlength="${max}" placeholder="${escapeHTML(placeholder)}"`;
  return `<label class="field" for="field-${path}"><span class="field-name">${label}${optional ? '<span class="optional">选填</span>' : ''}</span>${multiline ? `<textarea ${attributes} rows="3">${value}</textarea>` : `<input ${attributes} value="${value}" />`}${hint ? `<small>${hint}</small>` : ''}</label>`;
}
function upload(fieldName, label) {
  const image = state.images[state.kind][fieldName];
  return `<div class="upload-field"><label for="upload-${fieldName}">${label}</label><input id="upload-${fieldName}" data-upload="${fieldName}" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" /><div class="upload-row"><small>${image ? escapeHTML(image.name || '已选择图片') : 'PNG / JPG，单张不超过 5 MB'}</small><button type="button" class="text-button" data-clear-image="${fieldName}">${fieldName === 'portrait' ? '恢复默认头像' : '清除二维码'}</button></div></div>`;
}
function section(key, title, content, open = false) {
  return `<details class="form-section" data-section="${key}" ${open ? 'open' : ''}><summary>${title}</summary><div class="section-fields">${content}</div></details>`;
}
function listFields(key, title) {
  const entries = state.profiles.resume[key];
  const heading = key === 'facts' ? '' : field(`sections.${key}.title`, '栏目标题') + field(`sections.${key}.en`, '英文副标题', { optional: true });
  return section(key, title, heading + entries.map((item, index) => `<div class="repeat-item"><div class="repeat-heading"><span>${title} ${String(index + 1).padStart(2, '0')}</span><button type="button" class="text-button" data-remove="${key}" data-index="${index}" aria-label="删除${title}第${index + 1}项">删除</button></div>${repeatFields[key].map(([name, label, multiline]) => field(`${key}.${index}.${name}`, label, { multiline, optional: name === 'en' || name === 'subtitle', max: multiline ? 2000 : 120 })).join('')}</div>`).join('') + `<button type="button" class="add-item" data-add="${key}" ${entries.length >= (key === 'facts' ? 3 : 20) ? 'disabled' : ''}>＋ 添加一项</button>`);
}
function contactFields() {
  const contacts = state.profiles.strip.contacts;
  const items = contacts.map((contact, index) => {
    const path = `contacts.${index}`;
    return `<div class="repeat-item contact-item" data-contact-id="${contact.id}"><div class="repeat-heading"><span>联系方式 ${String(index + 1).padStart(2, '0')}</span><div class="contact-actions"><button type="button" class="text-button" data-contact-action="up" data-contact-id="${contact.id}" aria-label="上移联系方式第${index + 1}项" ${index === 0 ? 'disabled' : ''}>上移</button><button type="button" class="text-button" data-contact-action="down" data-contact-id="${contact.id}" aria-label="下移联系方式第${index + 1}项" ${index === contacts.length - 1 ? 'disabled' : ''}>下移</button><button type="button" class="text-button" data-contact-action="remove" data-contact-id="${contact.id}" aria-label="删除联系方式第${index + 1}项">删除</button></div></div>${field(`${path}.platform`, '平台', { optional: true, max: 80, placeholder: 'QQ / 微信 / 小红书 / B站 / 其他' })}${field(`${path}.account`, '账号 / ID', { optional: true, max: 200 })}${field(`${path}.note`, '备注', { multiline: true, optional: true, max: 500, placeholder: '例如：加好友请备注漫展名' })}<label class="check-field"><input type="checkbox" data-path="${path}.show_qr" ${contact.show_qr ? 'checked' : ''} />显示二维码区域</label>${upload(contactImageKey(contact.id), '上传这项的二维码')}</div>`;
  }).join('');
  const buttons = ['QQ', '微信', '小红书', 'B站', '自定义'].map((platform) => `<button type="button" class="secondary-button" data-add-contact="${platform}" ${contacts.length >= maxContacts ? 'disabled' : ''}>＋ ${platform}</button>`).join('');
  return section('contact', '05 / 联系方式', '<p class="section-help">按需组合多个平台，每项可单独上传二维码，也可以只留账号。支持调整顺序，最多 12 项。</p>' + items + `<div class="contact-presets" role="group" aria-label="添加联系方式">${buttons}</div>`);
}
function renderForm(preserveOpen = false) {
  const expanded = new Set([...document.querySelectorAll('.form-section[open]')].map((node) => node.dataset.section));
  let html;
  if (state.kind === 'strip') {
    html = section('about', 'About me · 称呼与头像',
      field('nickname', '昵称 / CN', { max: 24 }) + field('about_me', 'About me', { multiline: true, optional: true, placeholder: '年龄 / MBTI / 常驻城市\n性格、日常爱好，或一句自我介绍', hint: '显示在头像左侧，可分行填写；内容较多时自然向下展开。' }) + upload('portrait', '替换头像') + field('uid', '游戏 UID', { optional: true, max: 60, placeholder: '显示在头像下方' }) + field('tagline', '页首短句', { optional: true, max: 100 }), true)
      + section('fandoms', '01 / 坑', field('fandoms', '坑', { multiline: true, optional: true, placeholder: '喜欢的 IP、游戏、动画、作品或圈子\n也可以分组写常驻和近期兴趣' }), true)
      + section('favorites', '02 / 我推', field('favorites', '我推', { multiline: true, optional: true, placeholder: '喜欢的角色，可按作品分组' }))
      + section('boundaries', '03 / NG', field('boundaries', 'NG', { multiline: true, optional: true, placeholder: '希望避开的内容、互动边界等；没有可以留空' }))
      + section('other', '04 / 其他', field('other', '其他', { multiline: true, optional: true, placeholder: '日常、互动习惯、漫展出没或其他想补充的话' }))
      + contactFields();
  } else {
    html = section('about', '基本资料', '<p class="section-help">示例为开拓者同人简历。可改成自己的经历；篇幅需要控制在一张 A4 内。</p>' + field('name', '姓名 / 称呼', { max: 10 }) + field('uid', 'UID', { optional: true, max: 60 }) + field('identity', '身份 / 所属', { max: 100 }) + field('job_title', '求职意向', { max: 100 }) + field('job_note', '一句话优势', { optional: true, max: 100 }) + field('closing', '页尾短句', { optional: true, max: 100 }) + upload('portrait', '替换头像'), true)
      + listFields('facts', '简历摘要') + listFields('paths', '技术栈') + listFields('skills', '专业能力') + listFields('projects', '项目经历');
  }
  $('#editor-form').innerHTML = html;
  if (preserveOpen) document.querySelectorAll('.form-section').forEach((node) => { node.open = expanded.has(node.dataset.section); });
  $('#presets').hidden = state.kind !== 'strip';
  document.querySelectorAll('[data-kind]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.kind === state.kind)));
  document.querySelectorAll('[data-theme]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.theme === state.theme)));
  $('.preview-hint').textContent = state.kind === 'strip' ? '空白条目会自动隐藏' : '一页 A4 · 内容过多时会提示';
}
function invalidate(message = '内容已更新，等待生成预览…') {
  state.revision++;
  state.result = null;
  $('#download-pdf').disabled = true;
  $('#download-png').disabled = true;
  $('#preview-stage').setAttribute('aria-busy', 'true');
  setStatus(message);
  clearTimeout(state.timer);
  if ($('#auto-preview').checked) state.timer = setTimeout(() => renderPreview(), 700);
}
async function renderPreview() {
  clearTimeout(state.timer);
  if (!state.profiles[state.kind]) return;
  if (uploading[state.kind].size) { setStatus('正在读取图片，请稍等…'); return; }
  if (state.busy) { state.queued = true; return; }
  state.busy = true;
  state.queued = false;
  const revision = state.revision;
  const kind = state.kind;
  const theme = state.theme;
  const profile = clone(state.profiles[kind]);
  const images = clone(state.images[kind]);
  const current = () => state.revision === revision;
  $('#preview-stage').setAttribute('aria-busy', 'true');
  try {
    const name = kind === 'strip' ? profile.nickname : profile.name;
    if (!name.trim()) throw new Error(`请先填写${kind === 'strip' ? '昵称 / CN' : '姓名 / 称呼'}。`);
    const result = await compileDocument({ kind, theme, profile, images }, (message) => { if (current()) setStatus(message); });
    if (!current()) return;
    const pdf = await PDFDocument.load(result.pdf);
    if (!current()) return;
    if (pdf.getPageCount() !== 1) throw new Error('当前内容超过一页，请精简内容后再下载。');
    const { width, height } = pdf.getPage(0).getSize();
    const url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }));
    if (state.previewURL) URL.revokeObjectURL(state.previewURL);
    state.previewURL = url;
    const img = $('#preview-image');
    img.src = url;
    img.className = kind;
    img.hidden = false;
    $('#empty-preview').hidden = true;
    state.result = { ...result, width, height, revision, kind, theme };
    $('#dimensions').textContent = `${(width * 25.4 / 72).toFixed(0)} × ${(height * 25.4 / 72).toFixed(1)} mm`;
    $('#download-pdf').disabled = false;
    $('#download-png').disabled = false;
    $('#export-note').textContent = kind === 'strip' && height * 25.4 / 72 > 267 ? '这是长条成品；PDF / PNG 保留完整内容。' : 'PDF 打印请选择实际大小；PNG 为 300 dpi。';
    setStatus('预览已更新，可以下载当前成品。', 'success');
  } catch (error) {
    if (current()) {
      state.result = null;
      $('#download-pdf').disabled = true;
      $('#download-png').disabled = true;
      setStatus(error.message || '生成失败，请重试。', 'error');
    }
  } finally {
    state.busy = false;
    if (current()) $('#preview-stage').setAttribute('aria-busy', 'false');
    if (state.queued) { state.queued = false; renderPreview(); }
  }
}
async function readJSON(path) {
  const response = await fetch(new URL(path, base), { cache: 'no-cache' });
  if (!response.ok) throw new Error('模板资料加载失败，请刷新页面重试。');
  return response.json();
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function filename(result, extension) { return `trailblazer-${result.kind}-${result.theme}.${extension}`; }
async function downloadPNG() {
  const result = state.result;
  if (!result || result.revision !== state.revision) return;
  $('#download-png').disabled = true;
  setStatus('正在导出高清 PNG…');
  let url;
  try {
    const width = Math.round(result.width * 300 / 72);
    const height = Math.round(result.height * 300 / 72);
    if (width > 16384 || height > 16384 || width * height > 40_000_000) throw new Error('长图超出浏览器图片尺寸，请下载 PDF 保留完整内容。');
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.src = url;
    await img.decode();
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法生成图片，请下载 PDF。');
    context.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG 生成失败，请重试或下载 PDF。');
    if (result.revision !== state.revision) return;
    download(blob, filename(result, 'png'));
    setStatus('PNG 已生成，预览与下载内容一致。', 'success');
  } catch (error) {
    if (result.revision === state.revision) setStatus(error.message, 'error');
  } finally {
    if (url) URL.revokeObjectURL(url);
    if (result.revision === state.revision) $('#download-png').disabled = false;
  }
}
async function checkedImage(bytes, name = '已导入图片') {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('图片需小于 5 MB。');
  const extension = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? 'png' : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'jpg' : null;
  if (!extension) throw new Error('请选择有效的 PNG 或 JPG 图片。');
  const url = URL.createObjectURL(new Blob([bytes], { type: extension === 'png' ? 'image/png' : 'image/jpeg' }));
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 25_000_000) throw new Error('图片尺寸过大，请使用不超过 2500 万像素的图片。');
  } catch (error) {
    throw new Error(error.message.includes('尺寸') ? error.message : '无法读取这张图片，请换一个 PNG 或 JPG 文件。');
  } finally { URL.revokeObjectURL(url); }
  return { data: bytes, extension, name };
}
function resetUploads(kind) {
  const keys = new Set([...uploading[kind], ...Object.keys(state.uploads[kind]), ...imageKeys(kind)]);
  uploading[kind].clear();
  keys.forEach((key) => { state.uploads[kind][key] = (state.uploads[kind][key] || 0) + 1; });
}
function clearImage(kind, key) {
  state.uploads[kind][key] = (state.uploads[kind][key] || 0) + 1;
  uploading[kind].delete(key);
  delete state.images[kind][key];
  if (key === 'portrait') state.profiles[kind].portrait = 'assets/stelle-id.png';
  else if (kind === 'strip') {
    const contact = state.profiles.strip.contacts.find((item) => contactImageKey(item.id) === key);
    if (contact) contact.qr_image = null;
  }
}
function checkImageBudget(images) {
  if (Object.values(images).reduce((size, image) => size + image.data.length, 0) > maxImageBytes) throw new Error('当前模板的图片合计需小于 20 MB，请压缩图片后重试。');
}
function encodeBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function validateProfile(kind, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('资料内容格式不正确。');
  if (kind === 'strip') {
    const profile = normalizeStripProfile(source);
    profile.portrait = 'assets/stelle-id.png';
    profile.contacts.forEach((contact) => { contact.qr_image = null; });
    return profile;
  }
  const model = clone(presets.resume);
  for (const key of Object.keys(model)) {
    if (key === 'portrait') continue;
    if (source[key] === undefined) continue;
    const value = source[key];
    if (typeof model[key] === 'string') {
      if (typeof value !== 'string') throw new Error(`资料字段 ${key} 必须是文字。`);
      if (textValue(value).length > 8000) throw new Error(`资料字段 ${key} 过长，请精简。`);
      model[key] = value;
    } else if (key === 'sections') {
      for (const sectionName of ['paths', 'skills', 'projects']) for (const prop of ['title', 'en']) {
        if (typeof value?.[sectionName]?.[prop] !== 'string') throw new Error('简历栏目名称格式不正确。');
        model.sections[sectionName][prop] = value[sectionName][prop];
      }
    } else if (repeatFields[key]) {
      if (!Array.isArray(value) || value.length > (key === 'facts' ? 3 : 20)) throw new Error(`资料字段 ${key} 的条目数量不正确。`);
      model[key] = value.map((item) => Object.fromEntries(repeatFields[key].map(([prop]) => {
        if (typeof item?.[prop] !== 'string' || item[prop].length > 4000) throw new Error(`资料字段 ${key}.${prop} 格式不正确。`);
        return [prop, item[prop]];
      })));
    }
  }
  model.portrait = 'assets/stelle-id.png';
  if (!model.name.trim() || [...model.name].length > 10) throw new Error('姓名请填写 1–10 个字符。');
  return model;
}

$('#editor-form').addEventListener('submit', (event) => event.preventDefault());
$('#editor-form').addEventListener('input', (event) => {
  const path = event.target.dataset.path;
  if (!path) return;
  setPath(state.profiles[state.kind], path, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
  invalidate();
});
$('#editor-form').addEventListener('change', async (event) => {
  const key = event.target.dataset.upload;
  if (!key || !event.target.files[0]) return;
  const file = event.target.files[0];
  const kind = state.kind;
  const token = (state.uploads[kind][key] || 0) + 1;
  state.uploads[kind][key] = token;
  event.target.value = '';
  uploading[kind].add(key);
  if (kind === 'strip' && key !== 'portrait') {
    const contact = state.profiles.strip.contacts.find((item) => contactImageKey(item.id) === key);
    contact.show_qr = true;
    event.target.closest('.contact-item').querySelector('input[type="checkbox"]').checked = true;
  }
  invalidate('正在读取图片，请稍等…');
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('图片需小于 5 MB。');
    const image = await checkedImage(new Uint8Array(await file.arrayBuffer()), file.name);
    if (state.uploads[kind][key] !== token || !imageKeys(kind).includes(key)) return;
    checkImageBudget({ ...state.images[kind], [key]: image });
    state.images[kind][key] = image;
    uploading[kind].delete(key);
    if (kind === state.kind) { renderForm(true); invalidate('图片已更新，正在准备预览…'); }
  } catch (error) {
    if (state.uploads[kind][key] !== token) return;
    uploading[kind].delete(key);
    if (kind === state.kind) { clearTimeout(state.timer); setStatus(error.message, 'error'); }
  }
});
$('#editor-form').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.clearImage) {
    clearImage(state.kind, button.dataset.clearImage);
  } else if (button.dataset.addContact) {
    const contacts = state.profiles.strip.contacts;
    if (contacts.length >= maxContacts) return;
    const platform = button.dataset.addContact === '自定义' ? '' : button.dataset.addContact;
    contacts.push({ id: crypto.randomUUID(), platform, account: '', note: '', show_qr: true, qr_image: null });
    renderForm(true); invalidate();
    document.querySelector(`[data-path="contacts.${contacts.length - 1}.${platform ? 'account' : 'platform'}"]`).focus();
    return;
  } else if (button.dataset.contactAction) {
    const contacts = state.profiles.strip.contacts;
    const index = contacts.findIndex((contact) => contact.id === button.dataset.contactId);
    if (index < 0) return;
    if (button.dataset.contactAction === 'remove') {
      clearImage('strip', contactImageKey(contacts[index].id));
      contacts.splice(index, 1);
    } else {
      const next = index + (button.dataset.contactAction === 'up' ? -1 : 1);
      if (next < 0 || next >= contacts.length) return;
      [contacts[index], contacts[next]] = [contacts[next], contacts[index]];
    }
  } else if (button.dataset.add) {
    const key = button.dataset.add;
    if (state.profiles.resume[key].length >= (key === 'facts' ? 3 : 20)) return;
    state.profiles.resume[key].push(Object.fromEntries(repeatFields[key].map(([fieldName]) => [fieldName, ''])));
  } else if (button.dataset.remove) {
    state.profiles.resume[button.dataset.remove].splice(Number(button.dataset.index), 1);
  } else return;
  renderForm(true); invalidate();
});
document.querySelectorAll('[data-kind]').forEach((button) => button.addEventListener('click', () => {
  if (!state.profiles[button.dataset.kind] || state.kind === button.dataset.kind) return;
  state.kind = button.dataset.kind; renderForm(); invalidate();
}));
document.querySelectorAll('[data-theme]').forEach((button) => button.addEventListener('click', () => {
  if (state.theme === button.dataset.theme) return;
  state.theme = button.dataset.theme; renderForm(true); invalidate();
}));
$('#refresh').addEventListener('click', () => renderPreview());
$('#auto-preview').addEventListener('change', () => {
  if ($('#auto-preview').checked) renderPreview();
  else { clearTimeout(state.timer); state.queued = false; }
});
$('#apply-preset').addEventListener('click', () => {
  if (!confirm('载入示例会替换当前扩列条内容和上传图片。需要保留时，请先保存资料。')) return;
  resetUploads('strip'); state.images.strip = {}; state.profiles.strip = clone(presets[$('#preset').value]);
  renderForm(); invalidate();
});
$('#download-pdf').addEventListener('click', () => {
  const result = state.result;
  if (result && result.revision === state.revision) download(new Blob([result.pdf], { type: 'application/pdf' }), filename(result, 'pdf'));
});
$('#download-png').addEventListener('click', downloadPNG);
$('#save-draft').addEventListener('click', () => {
  if (uploading[state.kind].size) { setStatus('图片尚未读取完成，请稍后再保存资料。'); return; }
  const keys = imageKeys(state.kind);
  const images = Object.fromEntries(Object.entries(state.images[state.kind]).filter(([key]) => keys.includes(key)).map(([key, value]) => [key, { name: value.name, base64: encodeBytes(value.data) }]));
  const draft = { version: 2, kind: state.kind, theme: state.theme, profile: state.profiles[state.kind], images };
  download(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }), `trailblazer-${state.kind}-draft.json`);
});
$('#load-draft').addEventListener('click', () => $('#draft-file').click());
$('#draft-file').addEventListener('change', async (event) => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  const revision = state.revision;
  try {
    if (file.size > 30 * 1024 * 1024) throw new Error('资料文件需小于 30 MB。');
    const data = JSON.parse(await file.text());
    if (![1, 2].includes(data.version) || !['strip', 'resume'].includes(data.kind) || !['light', 'dark'].includes(data.theme)) throw new Error('请选择通过本编辑器「保存资料」生成的 JSON 文件。');
    const migrated = data.kind === 'strip' ? migrateStripDraft(data.profile, data.images) : data;
    const profile = validateProfile(data.kind, migrated.profile);
    const images = {};
    for (const key of imageKeys(data.kind, profile)) {
      const entry = migrated.images?.[key];
      if (!entry) continue;
      if (typeof entry.base64 !== 'string' || entry.base64.length > 7_000_000) throw new Error('资料中的图片格式不正确。');
      images[key] = await checkedImage(Uint8Array.from(atob(entry.base64), (c) => c.charCodeAt(0)), typeof entry.name === 'string' ? entry.name : '已导入图片');
    }
    checkImageBudget(images);
    if (state.revision !== revision) throw new Error('导入期间内容发生变化，请重新选择资料文件。');
    if (!confirm('导入资料会替换该模板当前的内容，是否继续？')) return;
    resetUploads(data.kind); state.kind = data.kind; state.theme = data.theme; state.profiles[data.kind] = profile; state.images[data.kind] = images;
    renderForm(); invalidate('资料已导入，正在生成预览…');
  } catch (error) { setStatus(`导入失败：${error.message}`, 'error'); }
});

async function start() {
  try {
    const [standard, short, resume] = await Promise.all([
      readJSON('templates/strip/config/profile.json'), readJSON('templates/strip/config/examples/short.json'),
      readJSON('templates/resume-dark/config/profile.json'),
    ]);
    presets.default = normalizeStripProfile(standard); presets.short = normalizeStripProfile(short); presets.resume = resume;
    state.profiles.strip = clone(presets.default); state.profiles.resume = clone(resume);
    renderForm(); await renderPreview();
  } catch (error) { setStatus(error.message, 'error'); $('#preview-stage').setAttribute('aria-busy', 'false'); }
}
start();
