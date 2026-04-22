(function () {
  'use strict';

  var ROOT_DOMAIN = 'freewebsite.deal';
  var APP_ORIGIN = 'https://' + ROOT_DOMAIN;
  var BAR_HEIGHT = 48;

  function getSubdomain() {
    var hostname = window.location.hostname;
    if (!hostname.endsWith('.' + ROOT_DOMAIN)) return null;
    return hostname.slice(0, -(ROOT_DOMAIN.length + 1));
  }

  function currentDeploymentUrl() {
    return window.location.origin;
  }

  function applyBodyOffset() {
    document.body.style.marginTop = BAR_HEIGHT + 'px';
  }

  function removeBodyOffset() {
    document.body.style.marginTop = '';
  }

  function btn(label, onClick, styles) {
    var el = document.createElement('button');
    el.textContent = label;
    el.style.cssText =
      'display:inline-flex;align-items:center;padding:0 14px;height:32px;border-radius:6px;' +
      'font-size:13px;font-weight:500;cursor:pointer;border:none;transition:background 0.15s;' +
      (styles || '');
    el.addEventListener('click', onClick);
    return el;
  }

  function getActiveVariantNumber() {
    var pathname = window.location.pathname;
    if (pathname === '/design-2') return 2;
    if (pathname === '/design-3') return 3;
    return 1; // '/', '/design-1', or anything else defaults to Design 1
  }

  function buildBar(data) {
    var businessId = data.businessId;
    var variants = data.variants || [];
    var designSelected = data.approvalStatus === 'approved';
    var activeVariantNumber = getActiveVariantNumber();
    var activeVariant = variants.find(function (v) { return v.variant_number === activeVariantNumber; });

    var bar = document.createElement('div');
    bar.id = '__fwd-preview-bar';
    bar.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
      'height:' + BAR_HEIGHT + 'px;background:#111827;color:#f9fafb;' +
      'display:flex;align-items:center;padding:0 16px;gap:10px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      'font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,0.4);';

    // Dashboard link — far left
    var dashLink = document.createElement('a');
    dashLink.href = APP_ORIGIN + '/dashboard';
    dashLink.textContent = '← Dashboard';
    dashLink.style.cssText =
      'color:#9ca3af;font-size:12px;text-decoration:none;white-space:nowrap;';
    dashLink.addEventListener('mouseover', function () { dashLink.style.color = '#f9fafb'; });
    dashLink.addEventListener('mouseout', function () { dashLink.style.color = '#9ca3af'; });
    bar.appendChild(dashLink);

    // Left spacer — pushes tabs to center
    var spacerLeft = document.createElement('div');
    spacerLeft.style.flex = '1';
    bar.appendChild(spacerLeft);

    // Design variant tabs — centered, hidden after design is selected
    if (!designSelected) {
      var tabsWrap = document.createElement('div');
      tabsWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
      variants.forEach(function (v) {
        var isActive = v.variant_number === activeVariantNumber;
        var styles = isActive
          ? 'background:#1d4ed8;color:#fff;'
          : 'background:#374151;color:#d1d5db;';
        var path = '/design-' + v.variant_number;
        var vBtn = btn(v.label || ('Design ' + v.variant_number), function () {
          window.location.pathname = path;
        }, styles);
        if (isActive) {
          vBtn.title = 'Currently viewing';
        }
        tabsWrap.appendChild(vBtn);
      });
      bar.appendChild(tabsWrap);
    }

    // Right spacer — keeps tabs centered and pushes select btn to far right
    var spacerRight = document.createElement('div');
    spacerRight.style.flex = '1';
    bar.appendChild(spacerRight);

    // Select CTA — far right, only show if design not yet selected
    if (!designSelected && activeVariant) {
      var selectBtn = btn('Select Current Design', function () {
        selectDesign(businessId, activeVariant.id, selectBtn);
      }, 'background:#16a34a;color:#fff;');
      bar.appendChild(selectBtn);
    }

    return bar;
  }

  function selectDesign(businessId, variantId, button) {
    button.disabled = true;
    button.textContent = 'Selecting…';
    fetch(APP_ORIGIN + '/api/preview/' + businessId + '/select', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: variantId }),
    })
      .then(function (res) {
        if (res.ok) {
          button.textContent = 'Selected!';
          button.style.background = '#15803d';
        } else {
          button.textContent = 'Error — try again';
          button.disabled = false;
        }
      })
      .catch(function () {
        button.textContent = 'Error — try again';
        button.disabled = false;
      });
  }

  function showFeedbackPanel(businessId, activeVariant) {
    if (document.getElementById('__fwd-feedback-panel')) return;

    var overlay = document.createElement('div');
    overlay.id = '__fwd-feedback-panel';
    overlay.style.cssText =
      'position:fixed;top:' + BAR_HEIGHT + 'px;right:0;bottom:0;width:320px;z-index:2147483646;' +
      'background:#1f2937;color:#f9fafb;padding:20px;display:flex;flex-direction:column;gap:12px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;' +
      'box-shadow:-2px 0 8px rgba(0,0,0,0.4);';

    var title = document.createElement('div');
    title.textContent = 'Leave Feedback';
    title.style.cssText = 'font-size:15px;font-weight:600;';
    overlay.appendChild(title);

    // Category select
    var catLabel = document.createElement('label');
    catLabel.textContent = 'Category';
    catLabel.style.cssText = 'color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.5px;';
    overlay.appendChild(catLabel);

    var catSelect = document.createElement('select');
    catSelect.style.cssText =
      'background:#374151;color:#f9fafb;border:1px solid #4b5563;border-radius:6px;' +
      'padding:6px 10px;font-size:13px;width:100%;';
    ['design', 'content', 'layout', 'other'].forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
      catSelect.appendChild(opt);
    });
    overlay.appendChild(catSelect);

    // Textarea
    var textLabel = document.createElement('label');
    textLabel.textContent = 'Your feedback';
    textLabel.style.cssText = 'color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.5px;';
    overlay.appendChild(textLabel);

    var textarea = document.createElement('textarea');
    textarea.placeholder = 'What would you like to change?';
    textarea.style.cssText =
      'background:#374151;color:#f9fafb;border:1px solid #4b5563;border-radius:6px;' +
      'padding:8px 10px;font-size:13px;width:100%;resize:vertical;min-height:100px;' +
      'font-family:inherit;box-sizing:border-box;';
    overlay.appendChild(textarea);

    var submitBtn = btn('Submit Feedback', function () {
      var text = textarea.value.trim();
      if (!text) { textarea.focus(); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      fetch(APP_ORIGIN + '/api/preview/' + businessId + '/feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackText: text,
          category: catSelect.value,
          variantId: activeVariant ? activeVariant.id : undefined,
        }),
      })
        .then(function (res) {
          if (res.ok) {
            overlay.remove();
          } else {
            submitBtn.textContent = 'Error — try again';
            submitBtn.disabled = false;
          }
        })
        .catch(function () {
          submitBtn.textContent = 'Error — try again';
          submitBtn.disabled = false;
        });
    }, 'background:#1d4ed8;color:#fff;width:100%;justify-content:center;');
    overlay.appendChild(submitBtn);

    var closeBtn = btn('Cancel', function () { overlay.remove(); },
      'background:#374151;color:#9ca3af;width:100%;justify-content:center;');
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
  }

  function init() {
    var subdomain = getSubdomain();
    if (!subdomain) return;

    fetch(APP_ORIGIN + '/api/preview-bar/auth?subdomain=' + encodeURIComponent(subdomain), {
      method: 'GET',
      credentials: 'include',
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.businessId) return;
        applyBodyOffset();
        var bar = buildBar(data);
        document.body.insertBefore(bar, document.body.firstChild);
      })
      .catch(function () {
        // Silent fail — unauthenticated visitors should see nothing
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
