// scripts/login.js
// dotenvを読み込む
require('dotenv').config();

// 環境変数からFirebase設定を取得
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// HTML要素の取得
const googleSignInBtn = document.getElementById('google-sign-in');
const emailSignUpBtn = document.getElementById('email-sign-up');
const errorMessageDiv = document.getElementById('error-message');
const loginForm = document.getElementById('login-form'); // フォームの取得

// 言語データの変数
let currentLanguage = 'ja'; // デフォルト言語を日本語に設定
let languageData = {};

// 言語ファイルを読み込む関数
function loadLanguage(lang) {
    console.log(`言語ファイルをロード中: lang/${lang}.json`);
    fetch(`lang/${lang}.json`)
        .then(response => {
            console.log('言語ファイルのレスポンス:', response);
            if (!response.ok) {
                throw new Error('ネットワークレスポンスがOKではありません');
            }
            return response.json();
        })
        .then(data => {
            console.log('言語データ:', data);
            languageData = data;
            applyLanguage();
        })
        .catch(error => {
            console.error('言語ファイルの読み込みエラー:', error);
        });
}

// 言語を適用する関数
function applyLanguage() {
    // ヘッダー
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.textContent = languageData.header_title || "ログイン";
    }

    // ログインセクション
    const signinHeading = document.getElementById('signin-heading');
    if (signinHeading) {
        signinHeading.textContent = languageData.signin || "サインイン";
    }

    const signinEmailHeading = document.getElementById('signin-email-heading');
    if (signinEmailHeading) {
        signinEmailHeading.textContent = languageData.signin_email || "メールでサインイン";
    }

    // サインインボタン
    if (googleSignInBtn) {
        googleSignInBtn.innerHTML = `<img src="https://developers.google.com/identity/images/g-logo.png" alt="Google Logo"> ${languageData.signin || "サインイン"}`;
    }

    // メールサインイン・サインアップボタン
    if (loginForm) {
        const emailSignInBtn = document.getElementById('email-sign-in');
        const emailSignUpBtn = document.getElementById('email-sign-up');
        if (emailSignInBtn) {
            emailSignInBtn.textContent = languageData.signin || "サインイン";
        }
        if (emailSignUpBtn) {
            emailSignUpBtn.textContent = languageData.signup || "新規登録";
        }
    }

    // 入力フィールドのプレースホルダー
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.placeholder = languageData.email_placeholder || "メールアドレス";
    }

    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.placeholder = languageData.password_placeholder || "パスワード";
    }
}

// 言語を設定する関数
function setLanguage(lang) {
    currentLanguage = lang;
    loadLanguage(lang);
}

// ページ読み込み時にデフォルト言語をロード
window.addEventListener('load', () => {
    loadLanguage(currentLanguage);
});

// エラーメッセージ表示関数
function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
    setTimeout(() => {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    }, 5000); // 5秒後にメッセージを消す
}

// Google サインイン
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
        console.log('Googleサインインボタンがクリックされました'); // デバッグ用
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                // サインイン成功
                console.log('Google サインイン成功:', result.user);
                window.location.href = 'main.html'; // メイン画面にリダイレクト
            })
            .catch((error) => {
                console.error('Google サインインエラー:', error);
                showError(languageData.error_signin || "サインインに失敗しました。");
            });
    });
}

// メールでサインイン
if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // デフォルトのフォーム送信を防ぐ
        console.log('メールサインインフォームが送信されました'); // デバッグ用

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            showError(languageData.error_empty_fields || "メールアドレスとパスワードを入力してください。");
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('メールサインイン成功:', userCredential.user);
                window.location.href = 'main.html'; // メイン画面にリダイレクト
            })
            .catch((error) => {
                console.error('メールサインインエラー:', error);
                showError(languageData.error_signin || "サインインに失敗しました。");
            });
    });
}

// メールで新規登録
if (emailSignUpBtn) {
    emailSignUpBtn.addEventListener('click', () => {
        console.log('メールサインアップボタンがクリックされました'); // デバッグ用
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            showError(languageData.error_empty_fields || "メールアドレスとパスワードを入力してください。");
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('新規登録成功:', userCredential.user);
                const uid = userCredential.user.uid;
                // ユーザーデータをデータベースに追加
                database.ref(`Username/${uid}`).set({
                    UName: "", // 初期値として空
                    Uimage: "" // 初期値として空
                });
                database.ref(`Userdata/${uid}`).set({
                    // 初期データを必要に応じて設定
                });
                database.ref(`AcceptUser/${uid}`).set({
                    // 初期データを必要に応じて設定
                });
                window.location.href = 'main.html'; // メイン画面にリダイレクト
            })
            .catch((error) => {
                console.error('新規登録エラー:', error);
                showError(languageData.error_signup || "新規登録に失敗しました。");
            });
    });
}

// ビデオの再生制御
document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('video');
    video.muted = true; // ミュートを設定
    video.play().catch(() => {
        // 自動再生がブロックされた場合、ミュートを設定して再試行
        video.muted = true;
        video.play();
    });
});

  