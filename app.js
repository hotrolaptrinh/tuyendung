const jobsContainer = document.getElementById('jobsContainer');
const layoutsContainer = document.getElementById('layoutsContainer');
const preview = document.getElementById('preview');
const previewWrapper = document.getElementById('previewWrapper');
const exportButton = document.getElementById('exportButton');
const showGridToggle = document.getElementById('showGridToggle');
const reloadButton = document.getElementById('reloadDataButton');
const dataStatus = document.getElementById('dataStatus');

const state = {
  jobs: [],
  layouts: [],
  selectedJobs: new Set(),
  selectedLayoutId: null,
  isLoading: false,
  lastLoadedAt: null,
};

let html2canvasPromise = null;

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu từ ${path}`);
  }
  return response.json();
}

async function fetchJobsData() {
  const index = await fetchJson('data/jobs/index.json');
  if (!Array.isArray(index)) {
    throw new Error('Dữ liệu công việc không hợp lệ.');
  }

  const jobs = await Promise.all(
    index.map(async (entry) => {
      const fileName = typeof entry.file === 'string' ? entry.file : null;
      if (!fileName) {
        console.warn('Bỏ qua mục công việc vì thiếu đường dẫn tệp:', entry);
        return null;
      }

      try {
        const data = await fetchJson(`data/jobs/${fileName}`);
        const id = data.id ?? entry.id ?? fileName.replace(/\.json$/i, '');
        return { ...data, id };
      } catch (error) {
        console.error(error);
        return null;
      }
    })
  );

  return jobs.filter(Boolean);
}

async function fetchLayoutsData() {
  const layouts = await fetchJson('data/layouts.json');
  if (!Array.isArray(layouts)) {
    throw new Error('Dữ liệu layout không hợp lệ.');
  }
  return layouts;
}

function showLoadingPlaceholders() {
  jobsContainer.innerHTML = '<p class="loading">Đang tải danh sách công việc...</p>';
  layoutsContainer.innerHTML = '<p class="loading">Đang tải layout...</p>';
  preview.className = 'preview';
  preview.innerHTML =
    '<div class="preview__loading"><p>Đang tải dữ liệu mới, vui lòng chờ...</p></div>';
  exportButton.disabled = true;
}

function setLoadingUi(isLoading) {
  reloadButton.disabled = isLoading;
  reloadButton.textContent = isLoading ? 'Đang tải...' : 'Tải dữ liệu mới';
  reloadButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function updateStatus(message, status) {
  if (!dataStatus) return;
  dataStatus.textContent = message;
  dataStatus.dataset.state = status;
}

function formatTime(date) {
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

async function loadData({ preserveSelection = true } = {}) {
  if (state.isLoading) {
    return;
  }

  state.isLoading = true;
  updateStatus('Đang tải dữ liệu...', 'loading');
  setLoadingUi(true);
  showLoadingPlaceholders();

  const previousSelection = preserveSelection ? new Set(state.selectedJobs) : new Set();
  const previousLayoutId = preserveSelection ? state.selectedLayoutId : null;

  try {
    const [jobs, layouts] = await Promise.all([fetchJobsData(), fetchLayoutsData()]);

    state.jobs = jobs;
    state.layouts = layouts;

    const availableJobIds = new Set(jobs.map((job) => job.id));
    const selectedJobIds = preserveSelection
      ? [...previousSelection].filter((id) => availableJobIds.has(id))
      : [];
    state.selectedJobs = new Set(selectedJobIds);

    const hasPreviousLayout =
      previousLayoutId !== null && layouts.some((layout) => layout.id === previousLayoutId);
    state.selectedLayoutId = hasPreviousLayout ? previousLayoutId : layouts[0]?.id ?? null;

    renderJobList();
    renderLayoutOptions();

    const now = new Date();
    state.lastLoadedAt = now;
    updateStatus(`Đã cập nhật lúc ${formatTime(now)}`, 'success');
  } catch (error) {
    console.error(error);
    state.jobs = [];
    state.layouts = [];
    state.selectedJobs = new Set();
    state.selectedLayoutId = null;
    jobsContainer.innerHTML = `<p class="error">${error.message}</p>`;
    layoutsContainer.innerHTML = `<p class="error">${error.message}</p>`;
    renderPreview();
    updateStatus('Tải dữ liệu thất bại. Thử lại.', 'error');
  } finally {
    state.isLoading = false;
    setLoadingUi(false);
  }
}

function renderJobList() {
  jobsContainer.innerHTML = '';

  if (state.jobs.length === 0) {
    jobsContainer.innerHTML = '<p class="empty">Chưa có dữ liệu công việc.</p>';
    return;
  }

  state.jobs.forEach((job) => {
    const label = document.createElement('label');
    label.className = 'job-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = job.id;
    checkbox.checked = state.selectedJobs.has(job.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.selectedJobs.add(job.id);
      } else {
        state.selectedJobs.delete(job.id);
      }
      renderPreview();
    });

    const meta = document.createElement('div');
    meta.className = 'job-item__meta';

    const title = document.createElement('p');
    title.className = 'job-item__title';
    title.textContent = job.title;

    const company = document.createElement('p');
    company.className = 'job-item__company';
    company.textContent = job.company;

    const location = document.createElement('p');
    location.className = 'job-item__location';
    location.textContent = job.location;

    meta.append(title, company, location);
    label.append(checkbox, meta);
    jobsContainer.append(label);
  });
}

function renderLayoutOptions() {
  layoutsContainer.innerHTML = '';

  if (state.layouts.length === 0) {
    layoutsContainer.innerHTML = '<p class="empty">Chưa có layout để lựa chọn.</p>';
    return;
  }

  state.layouts.forEach((layout, index) => {
    const label = document.createElement('label');
    label.className = 'layout-item';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'layout';
    radio.value = layout.id;
    const shouldSelect =
      state.selectedLayoutId === null ? index === 0 : state.selectedLayoutId === layout.id;
    radio.checked = shouldSelect;

    if (shouldSelect) {
      state.selectedLayoutId = layout.id;
    }

    radio.addEventListener('change', () => {
      if (radio.checked) {
        state.selectedLayoutId = layout.id;
        renderPreview();
      }
    });

    const details = document.createElement('div');

    const title = document.createElement('p');
    title.className = 'layout-item__title';
    title.textContent = layout.name;

    const description = document.createElement('p');
    description.className = 'layout-item__description';
    description.textContent = layout.description;

    const tag = document.createElement('span');
    tag.className = 'layout-tag';
    tag.textContent = `ID: ${layout.id}`;

    details.append(title, description, tag);
    label.append(radio, details);
    layoutsContainer.append(label);
  });

  renderPreview();
}

function renderPreview() {
  preview.className = 'preview';
  preview.innerHTML = '';

  const layout = state.layouts.find((item) => item.id === state.selectedLayoutId);
  const selectedJobs = state.jobs.filter((job) => state.selectedJobs.has(job.id));

  if (!layout || selectedJobs.length === 0) {
    exportButton.disabled = true;
    const empty = document.createElement('div');
    empty.className = 'preview__empty';

    const title = document.createElement('h3');
    title.textContent = 'Chưa có dữ liệu để hiển thị';

    const description = document.createElement('p');
    description.textContent = 'Hãy chọn ít nhất một công việc và một layout để xem trước nội dung bài đăng.';

    empty.append(title, description);
    preview.append(empty);
    return;
  }

  if (!layout.template) {
    exportButton.disabled = true;
    const missing = document.createElement('div');
    missing.className = 'preview__empty';
    const title = document.createElement('h3');
    title.textContent = 'Layout chưa cấu hình template';
    const description = document.createElement('p');
    description.textContent = 'Hãy thêm thuộc tính "template" cho layout để hiển thị nội dung.';
    missing.append(title, description);
    preview.append(missing);
    return;
  }

  exportButton.disabled = false;
  preview.classList.add(`preview-layout--${layout.id}`);

  const templateContext = createPreviewContext(layout, selectedJobs);
  const html = renderTemplate(layout.template, templateContext);
  preview.innerHTML = html;
}

function createPreviewContext(layout, jobs) {
  const primaryJob = jobs[0];
  const primaryCompany = primaryJob.company ?? layout.headerSubtitle ?? 'Doanh nghiệp';

  const benefits = Array.from(
    new Set(jobs.flatMap((job) => (Array.isArray(job.benefits) ? job.benefits : [])))
  ).filter(Boolean);

  const applyInstructions = primaryJob.apply?.instructions ??
    'Liên hệ bộ phận nhân sự để được hướng dẫn.';
  const applyDeadline = primaryJob.apply?.deadline ?? '';
  const applyLinkUrl = primaryJob.apply?.applyLink ?? '';
  const contactPhone = primaryJob.contactPhone ?? '---';
  const interviewAddress = primaryJob.interviewAddress ?? 'Sẽ thông báo sau khi đạt phỏng vấn.';

  const jobsForTemplate = jobs.map((job) => ({
    ...job,
    description: Array.isArray(job.description) ? job.description : [],
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
  }));

  const header = {
    title: layout.headerTitle ?? 'We are hiring',
    subtitle: layout.headerSubtitle ?? 'Tuyển dụng',
    company: primaryCompany,
    tagline: layout.tagline ?? '',
  };

  const footerBase = {
    applyLabel: layout.footer?.applyLabel ?? 'Nộp hồ sơ',
    interviewLabel: layout.footer?.interviewLabel ?? 'Địa điểm phỏng vấn',
    contactLabel: layout.footer?.contactLabel ?? 'Liên hệ',
    applyInstructions,
    applyDeadline: applyDeadline || null,
    applyLinkUrl: applyLinkUrl || null,
    applyLinkLabel: layout.footer?.applyLinkLabel ?? 'Link ứng tuyển',
    interviewAddress,
    contactValue: applyDeadline ? `${contactPhone} • Hạn chót: ${applyDeadline}` : contactPhone,
    contactPhone,
  };

  return {
    layout,
    header,
    company: primaryCompany,
    tagline: layout.tagline ?? '',
    jobs: jobsForTemplate,
    hasJobs: jobsForTemplate.length > 0,
    benefits,
    hasBenefits: benefits.length > 0,
    primaryJob: {
      ...primaryJob,
      applyInstructions,
      applyDeadline,
      applyLinkUrl,
      contactPhone,
      interviewAddress,
    },
    footer: footerBase,
  };
}

function renderTemplate(template, data) {
  if (typeof template !== 'string' || template.length === 0) {
    return '';
  }
  const context = createTemplateContext(data);
  return renderTemplateInternal(template, context);
}

function renderTemplateInternal(template, context) {
  let output = template;
  const sectionPattern = /\{\{([#^])\s*([^}]+?)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;

  output = output.replace(sectionPattern, (match, type, key, content) => {
    const value = resolveTemplateValue(context, key.trim());
    if (type === '#') {
      if (Array.isArray(value)) {
        return value
          .map((item, index) =>
            renderTemplateInternal(content, createTemplateContext(item, context, { index }))
          )
          .join('');
      }
      if (isPlainObject(value)) {
        return renderTemplateInternal(content, createTemplateContext(value, context));
      }
      if (value) {
        return renderTemplateInternal(content, createTemplateContext(value, context));
      }
      return '';
    }

    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (!value || isEmptyArray) {
      return renderTemplateInternal(content, context);
    }
    return '';
  });

  output = output.replace(/\{\{\{\s*([^}]+?)\s*\}\}\}/g, (match, key) => {
    const value = resolveTemplateValue(context, key.trim());
    return value == null ? '' : String(value);
  });

  output = output.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, key) => {
    const trimmed = key.trim();
    if (!trimmed || ['#', '/', '^'].includes(trimmed[0])) {
      return match;
    }
    const value = resolveTemplateValue(context, trimmed);
    return value == null ? '' : escapeHtml(String(value));
  });

  return output;
}

function createTemplateContext(data, parent = null, meta = {}) {
  return { data, parent, meta };
}

function resolveTemplateValue(context, path) {
  if (!context) {
    return undefined;
  }

  const trimmed = path.trim();
  if (trimmed === '' || trimmed === 'this' || trimmed === '.') {
    return context.data;
  }
  if (trimmed === '@index') {
    return context.meta?.index ?? 0;
  }
  if (trimmed.startsWith('../')) {
    return resolveTemplateValue(context.parent, trimmed.slice(3));
  }

  const parts = trimmed.split('.');
  let currentContext = context;
  let value = currentContext.data;

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part || part === 'this' || part === '.') {
      continue;
    }
    if (part === '..') {
      currentContext = currentContext.parent ?? currentContext;
      value = currentContext.data;
      continue;
    }
    if (part === '@index') {
      return currentContext.meta?.index ?? 0;
    }
    if (value == null) {
      value = undefined;
      break;
    }
    value = value[part];
  }

  if (value === undefined && context.parent) {
    return resolveTemplateValue(context.parent, path);
  }

  return value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function escapeHtml(value) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (char) => map[char]);
}

async function handleExport() {
  const html2canvasInstance = await getHtml2canvas();
  exportButton.disabled = true;
  exportButton.textContent = 'Đang xuất...';
  try {
    document.body.classList.add('is-exporting');
    preview.classList.add('preview--export');
    await nextFrame();
    await nextFrame();
    const canvas = await html2canvasInstance(preview, {
      backgroundColor: '#ffffff',
      scale: window.devicePixelRatio < 2 ? 2 : window.devicePixelRatio,
    });
    const blob = await canvasToBlob(canvas);
    const layout = state.layouts.find((item) => item.id === state.selectedLayoutId);
    const company = state.jobs.find((job) => state.selectedJobs.has(job.id))?.company ?? 'tuyendung';
    const filename = `${slugify(company)}-${layout?.id ?? 'layout'}-${new Date()
      .toISOString()
      .slice(0, 10)}.png`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    alert(error.message);
  } finally {
    preview.classList.remove('preview--export');
    document.body.classList.remove('is-exporting');
    exportButton.disabled = false;
    exportButton.textContent = 'Xuất hình ảnh';
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Không thể tạo hình ảnh.'));
        }
      },
      'image/png',
      1
    );
  });
}

function getHtml2canvas() {
  if (typeof globalThis.html2canvas === 'function') {
    return Promise.resolve(globalThis.html2canvas);
  }

  if (!html2canvasPromise) {
    html2canvasPromise = import(
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js'
    )
      .then((module) => {
        const instance = module?.default ?? module?.html2canvas ?? module;
        if (typeof instance !== 'function') {
          throw new Error('Không thể khởi tạo thư viện html2canvas.');
        }
        globalThis.html2canvas = instance;
        return instance;
      })
      .catch((error) => {
        html2canvasPromise = null;
        console.error('Không thể tải html2canvas:', error);
        throw new Error(
          'Không thể tải thư viện html2canvas. Vui lòng kiểm tra kết nối mạng và thử lại.'
        );
      });
  }

  return html2canvasPromise;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

showGridToggle.addEventListener('change', () => {
  previewWrapper.classList.toggle('hide-grid', !showGridToggle.checked);
});

previewWrapper.classList.toggle('hide-grid', !showGridToggle.checked);

exportButton.addEventListener('click', handleExport);

reloadButton.addEventListener('click', () => {
  loadData({ preserveSelection: true });
});

getHtml2canvas().catch(() => {
  /* Kết nối có thể chưa sẵn sàng; xử lý khi người dùng xuất. */
});

loadData();
