import { Quill } from '@vueup/vue-quill'

const Inline = Quill.import('blots/inline')

class ButtonLinkBlot extends Inline {
  static create(value) {
    const node = super.create()
    if (value && typeof value === 'object') {
      node.setAttribute('href', value.href || '#')
      node.classList.add(value.style === 'secondary' ? 'btn-secondary' : 'btn-primary')
    } else if (typeof value === 'string') {
      node.setAttribute('href', value)
      node.classList.add('btn-primary')
    }
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener')
    return node
  }

  static formats(domNode) {
    return {
      href: domNode.getAttribute('href') || '',
      style: domNode.classList.contains('btn-secondary') ? 'secondary' : 'primary',
    }
  }

  format(name, value) {
    if (name === ButtonLinkBlot.blotName) {
      if (value) {
        this.domNode.setAttribute('href', value.href || '#')
        this.domNode.classList.remove('btn-primary', 'btn-secondary')
        this.domNode.classList.add(value.style === 'secondary' ? 'btn-secondary' : 'btn-primary')
      } else {
        this.domNode.removeAttribute('href')
        this.domNode.removeAttribute('target')
        this.domNode.removeAttribute('rel')
        this.domNode.classList.remove('btn', 'btn-primary', 'btn-secondary')
      }
    } else {
      super.format(name, value)
    }
  }
}

ButtonLinkBlot.blotName = 'buttonlink'
ButtonLinkBlot.tagName = 'A'
ButtonLinkBlot.className = 'btn'

Quill.register(ButtonLinkBlot, true)

// Dialog UI
function createDialog(existingFormat) {
  const href = existingFormat ? existingFormat.href : ''
  const style = existingFormat ? existingFormat.style : 'primary'

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;'

  const dialog = document.createElement('div')
  dialog.style.cssText = 'background:white;padding:24px;border-radius:8px;min-width:360px;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,sans-serif;'

  dialog.innerHTML = `
    <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">Lien bouton</h3>
    <div style="margin-bottom:12px;">
      <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:500;">URL</label>
      <input type="url" id="pb-btn-href" value="${href}" placeholder="https://..." style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px;" />
    </div>
    <div style="margin-bottom:20px;">
      <label style="display:block;margin-bottom:8px;font-size:13px;font-weight:500;">Style du bouton</label>
      <label style="display:inline-flex;align-items:center;margin-right:16px;cursor:pointer;">
        <input type="radio" name="pb-btn-style" value="primary" ${style === 'primary' ? 'checked' : ''} style="margin-right:6px;" />
        <span style="background:#007bff;color:white;padding:4px 12px;border-radius:4px;font-size:13px;font-weight:600;">Primaire</span>
      </label>
      <label style="display:inline-flex;align-items:center;cursor:pointer;">
        <input type="radio" name="pb-btn-style" value="secondary" ${style === 'secondary' ? 'checked' : ''} style="margin-right:6px;" />
        <span style="background:#6c757d;color:white;padding:4px 12px;border-radius:4px;font-size:13px;font-weight:600;">Secondaire</span>
      </label>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      ${existingFormat ? '<button id="pb-btn-remove" style="padding:8px 16px;border:1px solid #dc3545;background:white;color:#dc3545;border-radius:4px;cursor:pointer;font-size:13px;margin-right:auto;">Supprimer</button>' : ''}
      <button id="pb-btn-cancel" style="padding:8px 16px;border:1px solid #ccc;background:white;border-radius:4px;cursor:pointer;font-size:13px;">Annuler</button>
      <button id="pb-btn-confirm" style="padding:8px 16px;border:none;background:#007bff;color:white;border-radius:4px;cursor:pointer;font-size:13px;font-weight:500;">Appliquer</button>
    </div>
  `

  overlay.appendChild(dialog)
  document.body.appendChild(overlay)

  const hrefInput = dialog.querySelector('#pb-btn-href')
  hrefInput.focus()

  return new Promise((resolve) => {
    dialog.querySelector('#pb-btn-confirm').addEventListener('click', () => {
      const selectedStyle = dialog.querySelector('input[name="pb-btn-style"]:checked').value
      const url = hrefInput.value.trim()
      overlay.remove()
      resolve({ href: url || '#', style: selectedStyle })
    })

    dialog.querySelector('#pb-btn-cancel').addEventListener('click', () => {
      overlay.remove()
      resolve(null)
    })

    const removeBtn = dialog.querySelector('#pb-btn-remove')
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        overlay.remove()
        resolve({ remove: true })
      })
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove()
        resolve(null)
      }
    })
  })
}

// Quill Module
class ButtonLinkModule {
  constructor(quill) {
    this.quill = quill
    const toolbar = quill.getModule('toolbar')
    toolbar.addHandler('buttonlink', this.handler.bind(this))
  }

  async handler() {
    const quill = this.quill
    const range = quill.getSelection()
    if (!range) return

    const format = quill.getFormat(range)
    const existingFormat = format.buttonlink || null

    if (range.length === 0 && !existingFormat) {
      alert('Veuillez sélectionner du texte pour créer un lien bouton.')
      return
    }

    const result = await createDialog(existingFormat)
    if (!result) return

    if (result.remove) {
      if (range.length === 0 && existingFormat) {
        const [leaf] = quill.getLeaf(range.index)
        if (leaf && leaf.parent && leaf.parent.statics && leaf.parent.statics.blotName === 'buttonlink') {
          const blot = leaf.parent
          const index = quill.getIndex(blot)
          const length = blot.length()
          quill.formatText(index, length, 'buttonlink', false)
        }
      } else {
        quill.formatText(range.index, range.length, 'buttonlink', false)
      }
      return
    }

    if (range.length > 0) {
      quill.formatText(range.index, range.length, 'buttonlink', { href: result.href, style: result.style })
    } else if (existingFormat) {
      const [leaf] = quill.getLeaf(range.index)
      if (leaf && leaf.parent && leaf.parent.statics && leaf.parent.statics.blotName === 'buttonlink') {
        const blot = leaf.parent
        const index = quill.getIndex(blot)
        const length = blot.length()
        quill.formatText(index, length, 'buttonlink', { href: result.href, style: result.style })
      }
    }
  }
}

export default ButtonLinkModule
