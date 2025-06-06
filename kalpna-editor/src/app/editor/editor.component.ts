import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { html as beautifyHtml } from 'js-beautify';

@Component({
  selector: 'app-editor',
  standalone: false,
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css'
})
export class EditorComponent {
  isSourceView: boolean = false;
  showToolbar = false;
  position = { top: 0, left: 0 };


  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;
  constructor(private http: HttpClient) { }

  /* ---- Image Function Start */
  insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('image', file);

        this.http.post<{ path: string }>('http://localhost:3000/upload', formData)
          .subscribe(res => {
            const img = document.createElement('img');
            img.src = res.path; // e.g., http://localhost:3000/images/filename.jpg
            img.style.maxWidth = 'fit-content';
            this.insertNode(img);
          });
      }
    };

    input.click();
  }


  /* ---- Image Function End */

  /* ---- Source Function Start */

 toggleSourceCode() {
  this.isSourceView = !this.isSourceView;
  const editor = this.editorRef.nativeElement;

  if (this.isSourceView) {
    const content = editor.innerHTML;
    const formatted = beautifyHtml(content, {
      indent_size: 2,
      wrap_line_length: 80,
      preserve_newlines: true
    });
    editor.innerText = formatted;
  } else {
    editor.innerHTML = editor.innerText;
  }
}

  /* ---- Source Function End */

  /* ---- Table Function Start */

  showForm = false;
  rows?: number;
  cols?: number;

  toggleForm() {
    this.showForm = !this.showForm;
  }

  insertTable() {
    if (!this.rows || !this.cols || this.rows < 1 || this.cols < 1) {
      alert('Please enter valid number of rows and columns');
      return;
    }

    let tableHTML = `<table class="table table-bordered table-striped">`;

    // Add thead with first row as header
    tableHTML += '<thead><tr>';
    for (let j = 0; j < this.cols; j++) {
      tableHTML += `<th>Header ${j + 1}</th>`;
    }
    tableHTML += '</tr></thead>';

    // Add tbody for rest of the rows
    tableHTML += '<tbody>';
    for (let i = 1; i < this.rows; i++) {  // start from 1 because 0th row is header
      tableHTML += '<tr>';
      for (let j = 0; j < this.cols; j++) {
        tableHTML += `<td>Row ${i + 1} Col ${j + 1}</td>`;
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody>';

    tableHTML += '</table>';

    // Insert directly as HTML – this will apply styles immediately
    this.editorRef.nativeElement.innerHTML += tableHTML;

    this.showForm = false;

    // Reset form values
    this.rows = undefined;
    this.cols = undefined;
  }





  /* ---- Table Function End */


  /* ---- Text Function Start */


  onTextSelect(event: MouseEvent) {
    const selection = window.getSelection();

    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      this.position = {
        top: rect.top + window.scrollY - 40,
        left: rect.left + window.scrollX
      };

      this.showToolbar = true;
    } else {
      this.showToolbar = false;
    }
  }

  isLinkSelected = false;

  checkLinkSelection() {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const parent = range.startContainer.parentElement;
    this.isLinkSelected = !!(parent && parent.closest('a'));
  } else {
    this.isLinkSelected = false;
  }
}


format(command: string) {
  if (command === 'createLink') {
    const url = prompt('Enter link URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      const target = prompt('Open link in new tab? Type "_blank", "_self", etc. or leave empty:');
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const anchor = range.startContainer.parentElement;
        if (anchor && anchor.tagName === 'A' && target) {
          anchor.setAttribute('target', target);
        }
      }
    }
  } else {
    document.execCommand(command, false, '');
  }

  this.showToolbar = false;
}


  insertText(text: string) {
    const span = document.createElement('p');
    span.innerText = text;
    this.insertNode(span);
  }

  insertHeading(tag: string) {
  const heading = document.createElement(tag);
  heading.innerText = 'Heading Text'; // तुम्ही इथे dynamic input पण टाकू शकता
  this.insertNode(heading);
}



  private insertNode(node: Node) {
    const selection = window.getSelection();
    const editor = this.editorRef.nativeElement;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(node);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
      
        editor.appendChild(node);
      }
    } else {
      editor.appendChild(node);
    }

    editor.focus();
  }


  /* ---- Text Function End */


selectedFontSize: string = '12px';
fontSizes: string[] = ['8px', '10px', '12px', '14px', '18px', '24px', '36px', '48px', '72px', 'Default'];
applyFontSize(size: string) {
  this.selectedFontSize = size;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return;

  let parentSpan = selection.anchorNode?.parentElement;


  const extracted = range.cloneContents();

  // Create a temporary container to modify HTML
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(extracted);

  // Remove all inline font-size styles from inner elements
  const spans = tempDiv.querySelectorAll('span');
  spans.forEach(span => {
    span.style.fontSize = '';
    if (span.getAttribute('style') === '') {
      span.removeAttribute('style');
    }
  });

  
  if (parentSpan && parentSpan.tagName === 'SPAN') {
    if (size === 'Default') {
      parentSpan.style.fontSize = ''; // font-size हटवतो
    } else {
      parentSpan.style.fontSize = size;
    }
  } else if (size !== 'unset') {
    const span = document.createElement('span');
    span.style.fontSize = size;

    const extracted = range.extractContents();
    span.appendChild(extracted);
    range.insertNode(span);

    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}




  insertUnorderedList() {
  document.execCommand('insertUnorderedList', false, '');
}

insertOrderedList() {
  document.execCommand('insertOrderedList', false, '');
}


}
