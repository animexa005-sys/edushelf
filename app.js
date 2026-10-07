import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';


/* =========================================================
   FIREBASE CONFIGURATION
   ========================================================= */

const firebaseConfig = {
  apiKey: 'AIzaSyB3ex_o5KxVPvmWStYyDY391d19s6GV4lI',
  authDomain: 'theta-ff9b4.firebaseapp.com',
  projectId: 'theta-ff9b4',
  storageBucket: 'theta-ff9b4.firebasestorage.app',
  messagingSenderId: '785651198872',
  appId: '1:785651198872:web:c15c669f688d79976359ed',
  measurementId: 'G-Z393MLGLYG'
};


/* =========================================================
   CLOUDINARY CONFIGURATION
   ========================================================= */

const CLOUDINARY_CLOUD_NAME = 'qaocyxoc';
const CLOUDINARY_UPLOAD_PRESET = 'edushelf_pdfs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;


/* =========================================================
   INITIALIZE FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

let currentUser = null;
let notesCache = [];


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const esc = (s = '') =>
  String(s).replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));

const initials = n =>
  (n || '?').slice(0, 2).toUpperCase();

const dateText = v => {
  const d = v?.toDate ? v.toDate() : new Date(v);

  return isNaN(d)
    ? ''
    : d.toLocaleDateString();
};

const timeText = v => {
  const d = v?.toDate ? v.toDate() : new Date(v);

  return isNaN(d)
    ? ''
    : d.toLocaleString();
};


/* =========================================================
   TOAST
   ========================================================= */

function toast(msg) {

  const d = document.createElement('div');

  d.className = 'toast';

  d.textContent = msg;

  document.body.appendChild(d);

  setTimeout(() => d.remove(), 3200);
}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setBusy(button, busy, text = 'Working…') {

  if (!button) return;

  button.disabled = busy;

  button.textContent =
    busy
      ? text
      : button.dataset.originalText;
}


/* =========================================================
   FIREBASE ERROR HANDLING
   ========================================================= */

function friendlyError(e) {

  const code = e?.code || '';

  const map = {

    'auth/invalid-credential':
      'Invalid email/username or password.',

    'auth/wrong-password':
      'Incorrect password.',

    'auth/user-not-found':
      'No account exists with these credentials.',

    'auth/email-already-in-use':
      'That email is already registered.',

    'auth/invalid-email':
      'Please enter a valid email address.',

    'auth/weak-password':
      'Password must be at least 6 characters.',

    'auth/too-many-requests':
      'Too many attempts. Please wait and try again.',

    'auth/network-request-failed':
      'Network error. Please check your internet connection.',

    'auth/user-disabled':
      'This account has been disabled.',

    'permission-denied':
      'Firebase permission denied. Check your Firestore rules.',

    'failed-precondition':
      'Firebase configuration/index setup is incomplete.'
  };

  return map[code] ||
    e?.message ||
    'Something went wrong. Please try again.';
}


/* =========================================================
   GET USER PROFILE
   ========================================================= */

async function getProfile(uid = currentUser?.uid) {

  if (!uid) return null;

  const snapshot =
    await getDoc(doc(db, 'users', uid));

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data()
      }
    : null;
}


/* =========================================================
   AUTH SCREEN
   ========================================================= */

function authScreen() {

  $('app').innerHTML = `
    <div class="auth">

      <div class="auth-card">

        <div class="logo">
          Edu<span>Shelf</span>
        </div>

        <h1 id="authTitle">
          Welcome back
        </h1>

        <p class="muted" id="authSub">
          Sign in to discover and share useful study material.
        </p>

        <form id="authForm">

          <div
            class="field signup-only"
            style="display:none"
          >

            <label>
              Username
            </label>

            <input
              id="username"
              minlength="3"
              maxlength="30"
              autocomplete="username"
            >

          </div>


          <div class="field">

            <label>
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              autocomplete="email"
            >

          </div>


          <div class="field">

            <label>
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              minlength="6"
              autocomplete="current-password"
            >

          </div>


          <button
  class="btn primary block"
  id="authBtn"
  type="submit"
>
  Log in
</button>

<div
  style="
    display:flex;
    align-items:center;
    gap:10px;
    margin:16px 0;
    color:#888;
    font-size:13px;
  "
>
  <div style="flex:1;border-top:1px solid #ddd;"></div>
  OR
  <div style="flex:1;border-top:1px solid #ddd;"></div>
</div>

<button
  class="btn block"
  id="googleBtn"
  type="button"
>
  Continue with Google
</button>
                    <div
            style="
              display:flex;
              align-items:center;
              gap:10px;
              margin:16px 0;
              color:#888;
              font-size:13px;
            "
          >
            <div style="flex:1;border-top:1px solid #ddd;"></div>
            OR
            <div style="flex:1;border-top:1px solid #ddd;"></div>
          </div>

          <button
            class="btn block"
            id="googleBtn"
            type="button"
          >
            Continue with Google
          </button>

        </form>


        <div class="switch">

          <span id="switchText">
            New to EduShelf?
          </span>

          <span
            class="link"
            id="switch"
          >
            Create account
          </span>

        </div>

      </div>

    </div>
  `;


  let signup = false;

$('googleBtn').onclick =
  googleLogin;

  
  /* =====================================================
     SWITCH LOGIN / SIGNUP
     ===================================================== */

  $('switch').onclick = () => {

    signup = !signup;

    document.querySelector('.signup-only').style.display =
      signup
        ? 'block'
        : 'none';

    $('username').required = signup;

    $('authTitle').textContent =
      signup
        ? 'Create your account'
        : 'Welcome back';

    $('authSub').textContent =
      signup
        ? 'Create an account and verify your email to start using EduShelf.'
        : 'Sign in to discover and share useful study material.';

    $('authBtn').textContent =
      signup
        ? 'Sign up'
        : 'Log in';

    $('switchText').textContent =
      signup
        ? 'Already have an account?'
        : 'New to EduShelf?';

    $('switch').textContent =
      signup
        ? 'Log in'
        : 'Create account';
  };


  /* =====================================================
     AUTH FORM
     ===================================================== */

  $('authForm').onsubmit = async e => {

    e.preventDefault();

    const btn = $('authBtn');

    btn.dataset.originalText =
      btn.textContent;

    setBusy(
      btn,
      true,
      signup
        ? 'Creating account…'
        : 'Logging in…'
    );


    try {

      const email =
        $('email').value
          .trim()
          .toLowerCase();

      const password =
        $('password').value;


      /* =================================================
         SIGN UP
         ================================================= */

      if (signup) {

        const username =
          $('username').value
            .trim()
            .toLowerCase();


        /* Username validation */

        if (
          !/^[a-z0-9_]{3,30}$/.test(username)
        ) {

          throw new Error(
            'Username must be 3–30 characters and use only letters, numbers or _.'
          );
        }


        /* Check username */

        const existing =
          await getDocs(
            query(
              collection(db, 'users'),
              where('username', '==', username)
            )
          );


        if (!existing.empty) {

          throw new Error(
            'Username already exists.'
          );
        }


        /* Create Firebase account */

        const cred =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );


        /* Add display name */

        await updateProfile(
          cred.user,
          {
            displayName: username
          }
        );


        /* Create Firestore profile */

        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            uid: cred.user.uid,

            displayName: username,

            username,

            email,

            photoUrl: '',

            bio: '',

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()
          }
        );


        /* Send verification email */

        await sendEmailVerification(
          cred.user
        );


        /*
         IMPORTANT:
         Sign the user out immediately.

         They must verify their email
         before entering EduShelf.
        */

        await signOut(auth);


        toast(
          'Verification email sent. Please verify your email, then log in.'
        );

        return;
      }


      /* =================================================
         LOGIN
         ================================================= */

      let loginEmail = email;


      /*
       Allow login using either:

       email
       OR
       username
      */

      const byUsername =
        await getDocs(
          query(
            collection(db, 'users'),
            where('username', '==', email)
          )
        );


      if (!byUsername.empty) {

        loginEmail =
          byUsername.docs[0].data().email;
      }


      /* Firebase login */

      const cred =
        await signInWithEmailAndPassword(
          auth,
          loginEmail,
          password
        );


      /*
       Check email verification
      */

      if (!cred.user.emailVerified) {

        /*
         Send another verification email.
        */

        await sendEmailVerification(
          cred.user
        );


        await signOut(auth);


        throw new Error(
          'Please verify your email first. A new verification email has been sent.'
        );
      }


      /*
       Verified user continues normally.
      */

      toast(
        'Login successful.'
      );


    } catch (e) {

      toast(
        friendlyError(e)
      );

    } finally {

      setBusy(
        btn,
        false
      );
    }
  };
}

/* =========================================================
   GOOGLE LOGIN
   ========================================================= */

async function googleLogin() {

  const btn = $('googleBtn');

  if (!btn) return;

  btn.dataset.originalText =
    btn.textContent;

  setBusy(
    btn,
    true,
    'Connecting to Google…'
  );

  try {

    const result =
      await signInWithPopup(
        auth,
        googleProvider
      );

    const user =
      result.user;


    /*
     Google accounts are already
     authenticated by Google.
     Firebase normally marks them
     as emailVerified = true.
    */


    const existingProfile =
      await getProfile(user.uid);


    /* -----------------------------------------------
       CREATE PROFILE FOR NEW GOOGLE USER
       ----------------------------------------------- */

    if (!existingProfile) {

      /*
       Create a safe username.

       Google display names can contain:
       spaces, symbols, etc.

       Therefore we sanitize the name
       and add part of the UID so that
       usernames are much less likely to collide.
      */

      let baseUsername =
        (
          user.displayName ||
          'student'
        )
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 22);

      if (
        baseUsername.length < 3
      ) {
        baseUsername =
          'student';
      }

      const googleUsername =
        `${baseUsername}_${user.uid.slice(0, 6)}`;


      await setDoc(
        doc(
          db,
          'users',
          user.uid
        ),
        {

          uid:
            user.uid,

          displayName:
            user.displayName ||
            'Student',

          username:
            googleUsername,

          email:
            user.email,

          photoUrl:
            user.photoURL ||
            '',

          bio:
            '',

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );


    } else {

      /* ---------------------------------------------
         UPDATE EXISTING GOOGLE PROFILE
         --------------------------------------------- */

      await updateDoc(
        doc(
          db,
          'users',
          user.uid
        ),
        {

          email:
            user.email,

          photoUrl:
            user.photoURL ||
            existingProfile.photoUrl ||
            '',

          updatedAt:
            serverTimestamp()
        }
      );
    }


    toast(
      'Google login successful.'
    );


  } catch (e) {

    console.error(
      'Google sign-in error:',
      e
    );


    if (
      e?.code ===
      'auth/popup-closed-by-user'
    ) {

      toast(
        'Google sign-in was cancelled.'
      );

    } else if (
      e?.code ===
      'auth/popup-blocked'
    ) {

      toast(
        'Google popup was blocked. Please allow popups for EduShelf.'
      );

    } else if (
      e?.code ===
      'auth/account-exists-with-different-credential'
    ) {

      toast(
        'An account already exists with this email using another sign-in method.'
      );

    } else {

      toast(
        friendlyError(e)
      );
    }


  } finally {

    setBusy(
      btn,
      false
    );
  }
}
/* =========================================================
   MAIN LAYOUT
   ========================================================= */

async function layout(page) {

  const p =
    await getProfile();


  $('app').innerHTML = `

    <div class="shell">


      <aside class="sidebar">

        <div class="brand">

          <div class="logo">
            Edu<span>Shelf</span>
          </div>

        </div>


        <nav class="nav">

          <button data-p="home">
            ⌂<br>
            Home
          </button>

          <button data-p="search">
            ⌕<br>
            Search
          </button>

          <button data-p="upload">
            ＋<br>
            Upload
          </button>

          <button data-p="profile">
            ◉<br>
            Profile
          </button>

        </nav>


        <div class="user-mini">

          <div class="avatar">
            ${initials(
              p?.displayName ||
              currentUser?.displayName
            )}
          </div>

          <div>

            <b>
              ${esc(
                p?.displayName ||
                currentUser?.displayName ||
                'Student'
              )}
            </b>

            <div class="meta">
              Student
            </div>

          </div>

        </div>

      </aside>


      <main class="main">

        <div class="topbar">

          <div class="search">

            <span>⌕</span>

            <input
              id="globalSearch"
              placeholder="Search notes, subjects, tags..."
            >

          </div>


          <button
            class="btn primary"
            id="topUpload"
          >
            ＋ Upload note
          </button>

        </div>


        <div id="page"></div>

      </main>

    </div>
  `;


  document
    .querySelectorAll('.nav button')
    .forEach(button => {

      button.onclick = () =>
        render(button.dataset.p);

    });


  $('topUpload').onclick =
    () => render('upload');


  $('globalSearch').oninput = e => {

    const value =
      e.target.value.trim();

    if (value) {

      render(
        'search',
        value
      );
    }
  };


  const active =
    document.querySelector(
      `[data-p="${page}"]`
    );

  if (active) {

    active.classList.add('active');
  }
}


/* =========================================================
   LOAD NOTES
   ========================================================= */

async function loadNotes() {

  const snapshot =
    await getDocs(
      query(
        collection(db, 'notes'),
        orderBy(
          'createdAt',
          'desc'
        )
      )
    );


  notesCache =
    snapshot.docs.map(
      d => ({
        id: d.id,
        ...d.data()
      })
    );


  return notesCache;
}


/* =========================================================
   CHECK LIKE
   ========================================================= */

async function userLiked(noteId) {

  if (!currentUser) return false;

  const snapshot =
    await getDoc(
      doc(
        db,
        'notes',
        noteId,
        'likes',
        currentUser.uid
      )
    );


  return snapshot.exists();
}


/* =========================================================
   COMMENTS
   ========================================================= */

async function commentList(noteId) {

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          'notes',
          noteId,
          'comments'
        ),
        orderBy(
          'createdAt',
          'asc'
        )
      )
    );


  return snapshot.docs.map(
    d => ({
      id: d.id,
      ...d.data()
    })
  );
}


/* =========================================================
   NOTE CARD
   ========================================================= */

function noteCard(
  n,
  liked = false
) {

  return `

    <article
      class="card note-card"
      onclick="openNote('${n.id}')"
    >

      <div class="file-icon">
        📄
      </div>


      <div class="meta">
        ${esc(n.subject)}
        ·
        ${dateText(n.createdAt)}
      </div>


      <div class="note-title">
        ${esc(n.title)}
      </div>


      <div
        class="muted"
        style="font-size:13px"
      >
        ${esc(
          n.description || ''
        ).slice(0, 100)}
      </div>


      <div>

        ${(n.tags || [])
          .map(
            t =>
              `<span class="tag">
                ${esc(t)}
              </span>`
          )
          .join('')}

      </div>


      <div class="actions">

        <button
          onclick="
            event.stopPropagation();
            likeNote('${n.id}')
          "
          class="${liked ? 'liked' : ''}"
        >
          ♥
          ${Number(n.likesCount || 0)}
        </button>


        <button
          onclick="
            event.stopPropagation();
            openNote('${n.id}')
          "
        >
          💬
          ${Number(
            n.commentsCount || 0
          )}
        </button>


        <span class="meta">
          @${esc(
            n.uploaderName || 'student'
          )}
        </span>

      </div>

    </article>
  `;
}


/* =========================================================
   RENDER NOTE CARDS
   ========================================================= */

async function renderCards(notes) {

  const liked =
    await Promise.all(
      notes.map(
        n =>
          userLiked(n.id)
            .catch(() => false)
      )
    );


  return notes
    .map(
      (n, i) =>
        noteCard(
          n,
          liked[i]
        )
    )
    .join('');
}


/* =========================================================
   HOME
   ========================================================= */

async function home() {

  try {

    const notes =
      await loadNotes();


    $('page').innerHTML = `

      <section class="hero">

        <div>

          <h1>
            Learn. Share. Grow.
          </h1>

          <p>
            Discover useful notes shared by students like you.
          </p>

        </div>


        <button
          class="btn"
          onclick="render('upload')"
        >
          Share a note →
        </button>

      </section>


      <div class="section-head">

        <h2>
          Latest notes
        </h2>

        <span class="muted">
          ${notes.length}
          resources
        </span>

      </div>


      <div
        class="grid"
        id="notesGrid"
      >
        Loading…
      </div>
    `;


    $('notesGrid').innerHTML =
      notes.length
        ? await renderCards(notes)
        : `
          <div class="card empty">
            No notes yet.
            Upload the first one!
          </div>
        `;


  } catch (e) {

    $('page').innerHTML = `

      <div class="card empty">

        Unable to load notes.

        <br>

        <small>
          ${esc(
            friendlyError(e)
          )}
        </small>

      </div>
    `;
  }
}


/* =========================================================
   SEARCH
   ========================================================= */

async function search(q = '') {

  const notes =
    notesCache.length
      ? notesCache
      : await loadNotes();


  $('page').innerHTML = `

    <div class="section-head">

      <div>

        <h2>
          Search notes
        </h2>

        <div class="muted">
          Find notes by title,
          subject, description or tags.
        </div>

      </div>

    </div>


    <div class="field">

      <input
        id="searchInput"
        value="${esc(q)}"
        placeholder="Try: Data Structures, Maths, AI..."
      >

    </div>


    <div
      id="searchResults"
      class="grid"
    ></div>
  `;


  const show = async value => {

    const s =
      value
        .toLowerCase()
        .trim();


    const results =
      notes.filter(n => {

        const text = [

          n.title,

          n.subject,

          n.description,

          ...(n.tags || [])

        ]
          .join(' ')
          .toLowerCase();


        return !s ||
          text.includes(s);
      });


    $('searchResults').innerHTML =
      results.length
        ? await renderCards(results)
        : `
          <div class="card empty">
            No matching notes found.
          </div>
        `;
  };


  $('searchInput').oninput =
    e =>
      show(
        e.target.value
      );


  await show(q);
}


/* =========================================================
   UPLOAD
   ========================================================= */

async function upload() {

  $('page').innerHTML = `

    <div class="section-head">

      <div>

        <h2>
          Upload a note
        </h2>

        <div class="muted">
          Share a PDF with your classmates.
        </div>

      </div>

    </div>


    <div class="card">

      <form id="uploadForm">


        <div
          class="upload-zone"
          id="drop"
        >

          <div style="font-size:35px">
            📄
          </div>

          <b>
            Select a PDF
          </b>

          <div class="muted">
            PDF only · maximum 10 MB
          </div>

          <div
            class="file-name"
            id="fileName"
          ></div>

          <input
            id="file"
            type="file"
            accept="application/pdf,.pdf"
            hidden
          >

        </div>


        <div class="field">

          <label>
            Title
          </label>

          <input
            id="title"
            required
            placeholder="e.g. Data Structures Complete Notes"
          >

        </div>


        <div class="field">

          <label>
            Subject
          </label>

          <input
            id="subject"
            required
            placeholder="e.g. Data Structures"
          >

        </div>


        <div class="field">

          <label>
            Description
          </label>

          <textarea
            id="description"
            rows="3"
            required
            placeholder="What does this note cover?"
          ></textarea>

        </div>


        <div class="field">

          <label>
            Tags
          </label>

          <input
            id="tags"
            placeholder="DSA, CSE, Semester 3"
          >

        </div>


        <button
          class="btn primary"
          id="publishBtn"
        >
          Publish note
        </button>

      </form>

    </div>
  `;


  $('drop').onclick =
    () =>
      $('file').click();


  $('file').onchange = () => {

    $('fileName').textContent =
      $('file').files[0]?.name || '';
  };


  $('uploadForm').onsubmit =
    async e => {

      e.preventDefault();


      const file =
        $('file').files[0];


      if (!file) {

        return toast(
          'Please choose a PDF.'
        );
      }


      if (
        file.type !== 'application/pdf' &&
        !file.name
          .toLowerCase()
          .endsWith('.pdf')
      ) {

        return toast(
          'Only PDF files are supported.'
        );
      }


      if (
        file.size >
        MAX_FILE_SIZE
      ) {

        return toast(
          'PDF must be 10 MB or smaller.'
        );
      }


      if (
        CLOUDINARY_CLOUD_NAME.startsWith(
          'REPLACE'
        ) ||
        CLOUDINARY_UPLOAD_PRESET.startsWith(
          'REPLACE'
        )
      ) {

        return toast(
          'Cloudinary configuration is missing.'
        );
      }


      const btn =
        $('publishBtn');


      btn.dataset.originalText =
        'Publish note';


      setBusy(
        btn,
        true,
        'Uploading…'
      );


      try {

        const profile =
          await getProfile();


        const data =
          new FormData();


        data.append(
          'file',
          file
        );


        data.append(
          'upload_preset',
          CLOUDINARY_UPLOAD_PRESET
        );


        data.append(
          'folder',
          'edushelf/notes'
        );


        const response =
          await fetch(
            `https://api.cloudinary.com/v1_1/${encodeURIComponent(
              CLOUDINARY_CLOUD_NAME
            )}/auto/upload`,
            {
              method: 'POST',
              body: data
            }
          );


        const output =
          await response.json();


        if (
          !response.ok ||
          !output.secure_url
        ) {

          throw new Error(
            output.error?.message ||
            'File upload failed.'
          );
        }


        await addDoc(
          collection(
            db,
            'notes'
          ),
          {

            title:
              $('title')
                .value
                .trim(),

            subject:
              $('subject')
                .value
                .trim(),

            description:
              $('description')
                .value
                .trim(),

            tags:
              $('tags')
                .value
                .split(',')
                .map(
                  x =>
                    x.trim()
                )
                .filter(Boolean),

            uploaderId:
              currentUser.uid,

            uploaderName:
              profile?.displayName ||
              currentUser.displayName ||
              'Student',

            uploaderEmail:
              currentUser.email,

            fileUrl:
              output.secure_url,

            fileName:
              file.name,

            fileType:
              'application/pdf',

            fileSize:
              file.size,

            cloudinaryPublicId:
              output.public_id ||
              '',

            likesCount:
              0,

            commentsCount:
              0,

            downloads:
              0,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );


        toast(
          'Note published successfully.'
        );


        await render(
          'home'
        );


      } catch (e) {

        toast(
          friendlyError(e)
        );

      } finally {

        setBusy(
          btn,
          false
        );
      }
    };
}


/* =========================================================
   OPEN NOTE
   ========================================================= */

async function openNote(id) {

  let note =
    notesCache.find(
      x => x.id === id
    );


  if (!note) {

    const snapshot =
      await getDoc(
        doc(
          db,
          'notes',
          id
        )
      );


    if (!snapshot.exists()) {

      return toast(
        'Note not found.'
      );
    }


    note = {
      id,
      ...snapshot.data()
    };
  }


  const comments =
    await commentList(id)
      .catch(() => []);


  const liked =
    await userLiked(id)
      .catch(() => false);


  document.body.insertAdjacentHTML(
    'beforeend',
    `

    <div
      class="modal-bg"
      id="modal"
    >

      <div class="modal">


        <div class="modal-head">

          <div>

            <div class="meta">
              ${esc(note.subject)}
            </div>

            <h2>
              ${esc(note.title)}
            </h2>

          </div>


          <button
            class="close"
            onclick="
              document.getElementById('modal')?.remove()
            "
          >
            ×
          </button>

        </div>


        <p class="muted">
          ${esc(
            note.description || ''
          )}
        </p>


        <div class="meta">

          Uploaded by
          @${esc(
            note.uploaderName ||
            'student'
          )}

          ·

          ${timeText(
            note.createdAt
          )}

        </div>


        <div
          style="
            display:flex;
            gap:9px;
            margin:18px 0;
            flex-wrap:wrap;
          "
        >

          <button
            class="btn ${liked ? 'primary' : ''}"
            onclick="
              likeNote('${note.id}');
              document.getElementById('modal')?.remove();
              setTimeout(
                () => openNote('${note.id}'),
                250
              )
            "
          >
            ♥
            ${Number(
              note.likesCount || 0
            )}
          </button>


          <a
            class="btn primary"
            href="${esc(note.fileUrl)}"
            target="_blank"
            rel="noopener"
          >
            Open PDF
          </a>


          <a
            class="btn"
            href="${esc(note.fileUrl)}"
            target="_blank"
            rel="noopener"
            download
          >
            Download
          </a>


          ${
            note.uploaderId ===
            currentUser.uid
              ? `
                <button
                  class="btn danger"
                  onclick="
                    deleteNote('${note.id}')
                  "
                >
                  Delete note
                </button>
              `
              : ''
          }

        </div>


        <h3>
          Comments (${comments.length})
        </h3>


        <div>

          ${
            comments.length

              ? comments.map(c => `

                <div class="comment">

                  <b>
                    @${esc(
                      c.userName ||
                      'student'
                    )}
                  </b>

                  <p>
                    ${esc(
                      c.text
                    )}
                  </p>

                  <span class="meta">
                    ${timeText(
                      c.createdAt
                    )}
                  </span>

                  ${
                    c.userId ===
                    currentUser.uid

                      ? `
                        <button
                          class="btn danger"
                          style="
                            padding:3px 7px;
                            font-size:11px
                          "
                          onclick="
                            deleteComment(
                              '${note.id}',
                              '${c.id}'
                            )
                          "
                        >
                          Delete
                        </button>
                      `

                      : ''
                  }

                </div>

              `).join('')

              : `
                <div class="empty">
                  No comments yet.
                </div>
              `
          }

        </div>


        <form
          id="commentForm"
          style="margin-top:15px"
        >

          <div class="field">

            <input
              id="commentText"
              required
              maxlength="500"
              placeholder="Write a comment..."
            >

          </div>


          <button
            class="btn primary"
          >
            Comment
          </button>

        </form>


      </div>

    </div>
  `);


  $('commentForm').onsubmit =
    async e => {

      e.preventDefault();


      const text =
        $('commentText')
          .value
          .trim();


      if (!text) return;


      try {

        const profile =
          await getProfile();


        await addDoc(
          collection(
            db,
            'notes',
            id,
            'comments'
          ),
          {

            userId:
              currentUser.uid,

            userName:
              profile?.displayName ||
              currentUser.displayName ||
              'Student',

            text,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );


        await updateDoc(
          doc(
            db,
            'notes',
            id
          ),
          {

            commentsCount:
              increment(1),

            updatedAt:
              serverTimestamp()
          }
        );


        document
          .getElementById('modal')
          ?.remove();


        toast(
          'Comment added.'
        );


        await openNote(id);


      } catch (err) {

        toast(
          friendlyError(err)
        );
      }
    };
}


/* =========================================================
   LIKE NOTE
   ========================================================= */

async function likeNote(id) {

  if (!currentUser) {

    return toast(
      'Please log in first.'
    );
  }


  try {

    const postRef =
      doc(
        db,
        'notes',
        id
      );


    const likeRef =
      doc(
        db,
        'notes',
        id,
        'likes',
        currentUser.uid
      );


    await runTransaction(
      db,
      async transaction => {

        const postSnapshot =
          await transaction.get(
            postRef
          );


        const likeSnapshot =
          await transaction.get(
            likeRef
          );


        if (!postSnapshot.exists()) {

          throw new Error(
            'Note not found.'
          );
        }


        const count =
          Number(
            postSnapshot.data()
              .likesCount || 0
          );


        if (
          likeSnapshot.exists()
        ) {

          transaction.delete(
            likeRef
          );


          transaction.update(
            postRef,
            {
              likesCount:
                Math.max(
                  0,
                  count - 1
                ),

              updatedAt:
                serverTimestamp()
            }
          );


        } else {

          transaction.set(
            likeRef,
            {
              userId:
                currentUser.uid,

              createdAt:
                serverTimestamp()
            }
          );


          transaction.update(
            postRef,
            {
              likesCount:
                count + 1,

              updatedAt:
                serverTimestamp()
            }
          );
        }
      }
    );


    const page =
      location.hash
        .replace('#', '') ||
      'home';


    await render(
      page
    );


  } catch (e) {

    toast(
      friendlyError(e)
    );
  }
}


/* =========================================================
   DELETE COMMENT
   ========================================================= */

async function deleteComment(
  noteId,
  commentId
) {

  try {

    const commentRef =
      doc(
        db,
        'notes',
        noteId,
        'comments',
        commentId
      );


    const commentSnapshot =
      await getDoc(
        commentRef
      );


    if (!commentSnapshot.exists()) {

      return toast(
        'Comment not found.'
      );
    }


    if (
      commentSnapshot.data()
        .userId !==
      currentUser.uid
    ) {

      return toast(
        'You can only delete your own comment.'
      );
    }


    await deleteDoc(
      commentRef
    );


    await updateDoc(
      doc(
        db,
        'notes',
        noteId
      ),
      {

        commentsCount:
          increment(-1),

        updatedAt:
          serverTimestamp()
      }
    );


    document
      .getElementById('modal')
      ?.remove();


    await openNote(
      noteId
    );


  } catch (e) {

    toast(
      friendlyError(e)
    );
  }
}


/* =========================================================
   DELETE NOTE
   ========================================================= */

async function deleteNote(id) {

  if (
    !confirm(
      'Delete this note from EduShelf?'
    )
  ) {
    return;
  }


  try {

    const ref =
      doc(
        db,
        'notes',
        id
      );


    const snapshot =
      await getDoc(ref);


    if (!snapshot.exists()) {

      return toast(
        'Note no longer exists.'
      );
    }


    if (
      snapshot.data()
        .uploaderId !==
      currentUser.uid
    ) {

      return toast(
        'You can only delete your own note.'
      );
    }


    await deleteDoc(
      ref
    );


    document
      .getElementById('modal')
      ?.remove();


    toast(
      'Note removed from EduShelf.'
    );


    await render(
      'profile'
    );


  } catch (e) {

    toast(
      friendlyError(e)
    );
  }
}


/* =========================================================
   PROFILE
   ========================================================= */

async function profile() {

  try {

    const p =
      await getProfile();


    const all =
      await loadNotes();


    const mine =
      all.filter(
        n =>
          n.uploaderId ===
          currentUser.uid
      );


    const likes =
      mine.reduce(
        (total, n) =>
          total +
          Number(
            n.likesCount || 0
          ),
        0
      );


    $('page').innerHTML = `

      <div class="card">

        <div class="profile">

          <div class="avatar">

            ${initials(
              p?.displayName ||
              currentUser.displayName
            )}

          </div>


          <div>

            <h2 style="margin:0">

              @${esc(
                p?.displayName ||
                'student'
              )}

            </h2>


            <div class="muted">

              ${esc(
                p?.bio ||
                'Student on EduShelf'
              )}

            </div>


            <div class="meta">

              ${esc(
                p?.email ||
                currentUser.email ||
                ''
              )}

            </div>

          </div>

        </div>


        <div class="stats">

          <div class="stat">

            <b>
              ${mine.length}
            </b>

            <span>
              Notes
            </span>

          </div>


          <div class="stat">

            <b>
              ${likes}
            </b>

            <span>
              Likes received
            </span>

          </div>

        </div>


        <button
          class="btn"
          style="margin-top:18px"
          onclick="editProfile()"
        >
          Edit profile
        </button>

      </div>


      <div class="section-head">

        <h2>
          My notes
        </h2>

      </div>


      <div class="grid">

        ${
          mine.length

            ? await renderCards(
                mine
              )

            : `
              <div class="card empty">
                You have not uploaded anything yet.
              </div>
            `
        }

      </div>
    `;


  } catch (e) {

    $('page').innerHTML = `

      <div class="card empty">

        Unable to load profile.

        <br>

        ${esc(
          friendlyError(e)
        )}

      </div>
    `;
  }
}


/* =========================================================
   EDIT PROFILE
   ========================================================= */

async function editProfile() {

  const p =
    await getProfile();


  document.body.insertAdjacentHTML(
    'beforeend',
    `

    <div
      class="modal-bg"
      id="modal"
    >

      <div class="modal">

        <div class="modal-head">

          <h2>
            Edit profile
          </h2>

          <button
            class="close"
            onclick="
              document.getElementById('modal')?.remove()
            "
          >
            ×
          </button>

        </div>


        <form id="profileForm">

          <div class="field">

            <label>
              Display name
            </label>

            <input
              id="editUsername"
              value="${esc(
                p?.displayName || ''
              )}"
              required
              minlength="3"
              maxlength="30"
            >

          </div>


          <div class="field">

            <label>
              Bio
            </label>

            <textarea
              id="editBio"
              rows="3"
              maxlength="300"
            >${esc(
              p?.bio || ''
            )}</textarea>

          </div>


          <button
            class="btn primary"
          >
            Save changes
          </button>

        </form>


        <button
          class="btn danger"
          style="margin-top:10px"
          id="logoutBtn"
        >
          Log out
        </button>

      </div>

    </div>
  `);


  $('profileForm').onsubmit =
    async e => {

      e.preventDefault();


      try {

        const name =
          $('editUsername')
            .value
            .trim();


        if (
          name.length < 3
        ) {

          return toast(
            'Display name must contain at least 3 characters.'
          );
        }


        await updateDoc(
          doc(
            db,
            'users',
            currentUser.uid
          ),
          {

            displayName:
              name,

            bio:
              $('editBio')
                .value
                .trim(),

            updatedAt:
              serverTimestamp()
          }
        );


        await updateProfile(
          currentUser,
          {
            displayName:
              name
          }
        );


        document
          .getElementById('modal')
          ?.remove();


        toast(
          'Profile updated.'
        );


        await render(
          'profile'
        );


      } catch (err) {

        toast(
          friendlyError(err)
        );
      }
    };


  $('logoutBtn').onclick =
    logout;
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  try {

    await signOut(
      auth
    );

  } catch (e) {

    toast(
      friendlyError(e)
    );
  }
}


/* =========================================================
   MAIN RENDER
   ========================================================= */

async function render(
  page = 'home',
  arg = ''
) {

  if (!currentUser) {

    authScreen();

    return;
  }


  await layout(
    page
  );


  location.hash =
    page;


  if (page === 'home') {

    await home();

  } else if (page === 'search') {

    await search(arg);

  } else if (page === 'upload') {

    await upload();

  } else if (page === 'profile') {

    await profile();

  } else {

    await home();
  }
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.render =
  render;

window.openNote =
  openNote;

window.likeNote =
  likeNote;

window.deleteComment =
  deleteComment;

window.deleteNote =
  deleteNote;

window.editProfile =
  editProfile;

window.logout =
  logout;


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    currentUser =
      user;


    /* -----------------------------------------------
       NO USER
       ----------------------------------------------- */

    if (!user) {

      authScreen();

      return;
    }


    /* -----------------------------------------------
       EMAIL NOT VERIFIED
       ----------------------------------------------- */

    if (!user.emailVerified) {

      /*
       Do not allow access to the application.
      */

      toast(
        'Please verify your email before using EduShelf.'
      );


      try {

        await signOut(
          auth
        );

      } catch (e) {

        console.error(
          'Sign out error:',
          e
        );
      }


      return;
    }


    /* -----------------------------------------------
       VERIFIED USER
       ----------------------------------------------- */

    try {

      const profile =
        await getProfile(
          user.uid
        );


      /*
       If profile somehow does not exist,
       recreate the basic profile.
      */

      if (!profile) {

        await setDoc(
          doc(
            db,
            'users',
            user.uid
          ),
          {

            uid:
              user.uid,

            displayName:
              user.displayName ||
              'Student',

            username:
              user.displayName ||
              'student',

            email:
              user.email,

            photoUrl:
              user.photoURL ||
              '',

            bio:
              '',

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          },
          {
            merge: true
          }
        );
      }


      await render(
        location.hash
          .replace('#', '') ||
        'home'
      );


    } catch (e) {

      console.error(
        'Application initialization error:',
        e
      );


      toast(
        friendlyError(e)
      );
    }
  }
);
