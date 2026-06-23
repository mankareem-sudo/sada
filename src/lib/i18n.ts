/**
 * Sada Internationalization (i18n)
 * 
 * Supports: Arabic (ar) and English (en)
 * Default: Arabic
 */

export type Language = 'ar' | 'en'

export interface Translations {
  [key: string]: {
    ar: string
    en: string
  }
}

export const translations: Translations = {
  // === App Name ===
  'app.name': { ar: 'صَدى', en: 'Sada' },
  'app.tagline': { ar: 'منصة الحوار الصوتي العربي', en: 'Arabic Voice Social Platform' },
  'app.description': {
    ar: 'كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. حوار هادئ بلا سخرية ولا إساءة.',
    en: 'Every day one question, 90-second voice answers. Calm dialogue without mockery or insult.'
  },

  // === Auth Screen ===
  'auth.signup': { ar: 'حساب جديد', en: 'Sign Up' },
  'auth.login': { ar: 'دخول', en: 'Login' },
  'auth.name': { ar: 'الاسم', en: 'Name' },
  'auth.username': { ar: 'اسم المستخدم', en: 'Username' },
  'auth.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'auth.password': { ar: 'كلمة المرور', en: 'Password' },
  'auth.createAccount': { ar: 'إنشاء الحساب', en: 'Create Account' },
  'auth.loginBtn': { ar: 'تسجيل الدخول', en: 'Sign In' },
  'auth.loading': { ar: 'جاري...', en: 'Loading...' },
  'auth.welcome': { ar: 'أهلاً بيك في صدى 🎙️', en: 'Welcome to Sada 🎙️' },
  'auth.forgotPassword': { ar: 'نسيت كلمة المرور؟', en: 'Forgot Password?' },
  'auth.noAccount': { ar: 'معندكش حساب؟', en: 'No account?' },
  'auth.haveAccount': { ar: 'عندك حساب؟', en: 'Have an account?' },
  'auth.communityPromise': {
    ar: 'بمشاركتك، بتوافق على الحفاظ على حوار هادئ خالي من السخرية بالأديان أو السياسة أو الإساءات الشخصية.',
    en: 'By participating, you agree to maintain calm dialogue free from religious mockery, politics, or personal insults.'
  },

  // === Onboarding ===
  'onboarding.title': { ar: 'أهلاً بيك في صدى 🎙️', en: 'Welcome to Sada 🎙️' },
  'onboarding.subtitle': {
    ar: 'عشان نخصص لك التجربة، اختار اهتماماتك:',
    en: 'To personalize your experience, choose your interests:'
  },
  'onboarding.skip': { ar: 'تخطي', en: 'Skip' },
  'onboarding.complete': { ar: 'إكمال', en: 'Complete' },
  'onboarding.interest.tech': { ar: 'تقنية وبرمجة', en: 'Tech & Programming' },
  'onboarding.interest.design': { ar: 'تصميم وفن', en: 'Design & Art' },
  'onboarding.interest.business': { ar: 'ريادة أعمال', en: 'Business' },
  'onboarding.interest.learning': { ar: 'تعلم وتطوير', en: 'Learning' },
  'onboarding.interest.health': { ar: 'صحة ولياقة', en: 'Health & Fitness' },
  'onboarding.interest.creativity': { ar: 'كتابة وإبداع', en: 'Writing & Creativity' },
  'onboarding.interest.culture': { ar: 'ثقافة وكتب', en: 'Culture & Books' },
  'onboarding.interest.life': { ar: 'تطوير الذات', en: 'Self-development' },

  // === Tabs ===
  'tab.today': { ar: 'اليوم', en: 'Today' },
  'tab.feed': { ar: 'الرئيسية', en: 'Feed' },
  'tab.discover': { ar: 'اكتشف', en: 'Discover' },
  'tab.trending': { ar: 'رائج', en: 'Trending' },
  'tab.bookmarks': { ar: 'محفوظات', en: 'Saved' },
  'tab.notifications': { ar: 'إشعارات', en: 'Notifications' },
  'tab.profile': { ar: 'حسابي', en: 'Profile' },
  'tab.admin': { ar: 'إدارة', en: 'Admin' },

  // === Today View ===
  'today.questionOfDay': { ar: 'سؤال اليوم', en: 'Today\'s Question' },
  'today.recordAnswer': { ar: 'سجّل إجابتك الصوتية', en: 'Record Your Voice Answer' },
  'today.maxDuration': { ar: '90 ثانية كحد أقصى · صوتك بنبرة طبيعية', en: '90 seconds max · Natural voice' },
  'today.recentAnswers': { ar: 'أحدث الإجابات لهذا السؤال', en: 'Recent Answers' },
  'today.viewAll': { ar: 'عرض الكل', en: 'View All' },
  'today.noAnswers': { ar: 'لسه مفيش حد سجل إجابة. كن أول واحد! 🎙️', en: 'No answers yet. Be the first! 🎙️' },
  'today.beFirst': { ar: 'ابدأ أنت', en: 'Start First' },
  'today.noPrompt': { ar: 'مفيش سؤال لليوم دلوقتي، ارجع قريب.', en: 'No question for today, check back soon.' },

  // === Recorder ===
  'recorder.title': { ar: 'سجّل صدى صوتك', en: 'Record Your Voice' },
  'recorder.review': { ar: 'راجع تسجيلك', en: 'Review Your Recording' },
  'recorder.start': { ar: 'اضغط على الميكروفون للبدء', en: 'Tap the microphone to start' },
  'recorder.maxDuration': { ar: 'اقصى مدة 90 ثانية', en: 'Max duration 90 seconds' },
  'recorder.stop': { ar: 'اضغط للإيقاف والمراجعة', en: 'Tap to stop and review' },
  'recorder.discard': { ar: 'إعادة التسجيل', en: 'Re-record' },
  'recorder.publish': { ar: 'نشر', en: 'Publish' },
  'recorder.uploading': { ar: 'جاري النشر...', en: 'Publishing...' },
  'recorder.published': { ar: 'تم نشر صدى صوتك 🎙️', en: 'Your voice has been published 🎙️' },
  'recorder.description': { ar: 'وصف اختياري (يساعد الناس يلاقوا صداك)', en: 'Optional description (helps people find your voice)' },
  'recorder.descriptionPlaceholder': {
    ar: 'مثال: تجربتي الأولى مع تعلم البرمجة...',
    en: 'Example: My first experience learning programming...'
  },
  'recorder.question': { ar: 'السؤال:', en: 'Question:' },

  // === Voice Player ===
  'player.speed': { ar: 'السرعة', en: 'Speed' },

  // === Voice Note Card ===
  'card.question': { ar: 'السؤال', en: 'Question' },
  'card.like': { ar: 'إعجاب', en: 'Like' },
  'card.save': { ar: 'حفظ', en: 'Save' },
  'card.share': { ar: 'مشاركة', en: 'Share' },
  'card.report': { ar: 'إبلاغ', en: 'Report' },
  'card.transcribe': { ar: 'ترجمة لنص', en: 'Transcribe' },
  'card.transcript': { ar: 'ترجمة الصوت', en: 'Transcript' },
  'card.transcribing': { ar: 'جاري ترجمة الصوت لنص...', en: 'Transcribing audio...' },
  'card.transcribeFailed': { ar: 'فشل الترجمة', en: 'Transcription failed' },
  'card.transcribeSuccess': { ar: 'اترجم الصوت لنص', en: 'Audio transcribed' },
  'card.addComment': { ar: 'أضف تعليق', en: 'Add a comment' },
  'card.comments': { ar: 'تعليق', en: 'Comments' },
  'card.reply': { ar: 'رد', en: 'Reply' },
  'card.delete': { ar: 'حذف', en: 'Delete' },
  'card.commentPlaceholder': { ar: 'اكتب تعليقك...', en: 'Write your comment...' },
  'card.replyPlaceholder': { ar: 'رد على', en: 'Reply to' },
  'card.noComments': { ar: 'مفيش تعليقات لسه. كن أول واحد!', en: 'No comments yet. Be the first!' },
  'card.send': { ar: 'إرسال', en: 'Send' },
  'card.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'card.loginToComment': { ar: 'سجّل دخولك للتعليق', en: 'Login to comment' },
  'card.loginToLike': { ar: 'سجّل دخول الأول عشان تعمل لايك', en: 'Login first to like' },
  'card.plays': { ar: 'تشغيل', en: 'plays' },

  // === Feed ===
  'feed.title': { ar: 'صدى اللي بتتابعهم', en: 'Following Feed' },
  'feed.empty': { ar: 'الـ feed بتاعك لسه فاضي', en: 'Your feed is still empty' },
  'feed.emptyDesc': {
    ar: 'ابدأ بمتابعة أصحاب من صفحة الاكتشاف، وهتلاقي أحدث صدى صوتهم هنا.',
    en: 'Start following people from Discover, and you\'ll see their latest voices here.'
  },
  'feed.explore': { ar: 'استكشف أصوات جديدة', en: 'Explore New Voices' },
  'feed.loadMore': { ar: 'تحميل المزيد', en: 'Load More' },

  // === Discover ===
  'discover.title': { ar: 'اكتشف أصوات', en: 'Discover Voices' },
  'discover.subtitle': {
    ar: 'استمع لإجابات الناس على أسئلة الأيام الماضية',
    en: 'Listen to people\'s answers from previous days'
  },
  'discover.all': { ar: 'الكل', en: 'All' },
  'discover.empty': { ar: 'مفيش أصوات في هذا القسم لسه.', en: 'No voices in this section yet.' },
  'discover.refresh': { ar: 'تحديث', en: 'Refresh' },

  // === Trending ===
  'trending.title': { ar: 'رائج هذا الأسبوع', en: 'Trending This Week' },
  'trending.subtitle': {
    ar: 'الأكثر سماعاً وتفاعلاً خلال الـ 7 أيام الماضية',
    en: 'Most listened and engaged in the last 7 days'
  },
  'trending.empty': {
    ar: 'لسه مفيش أصداء رائجة هذا الأسبوع. سجّل صدى وخلّيه يكون أول واحد!',
    en: 'No trending voices yet. Record one and be the first!'
  },
  'trending.badge': { ar: 'رائج', en: 'Trending' },

  // === Bookmarks ===
  'bookmarks.title': { ar: 'المحفوظات', en: 'Saved' },
  'bookmarks.subtitle': {
    ar: 'الأصداء اللي حفظتها للرجوع ليها بعدين',
    en: 'Voices you saved to revisit later'
  },
  'bookmarks.empty': {
    ar: 'لسه ماحفظتش أي صدى. اضغط على أيقونة الحفظ على أي تسجيل.',
    en: 'No saved voices yet. Tap the bookmark icon on any recording.'
  },

  // === Notifications ===
  'notifications.title': { ar: 'الإشعارات', en: 'Notifications' },
  'notifications.subtitle': { ar: 'كل تفاعلاتك في مكان واحد', en: 'All your interactions in one place' },
  'notifications.markAllRead': { ar: 'تحديد الكل كمقروء', en: 'Mark All Read' },
  'notifications.empty': {
    ar: 'مفيش إشعارات لسه. لما حد يعمل لايك أو يتابعك أو يعلّق على صداك، هتلاقيه هنا.',
    en: 'No notifications yet. When someone likes, follows, or comments on your voice, you\'ll see it here.'
  },

  // === Profile ===
  'profile.edit': { ar: 'تعديل', en: 'Edit' },
  'profile.recordNew': { ar: 'سجّل صدى جديد', en: 'Record New Voice' },
  'profile.follow': { ar: 'متابعة', en: 'Follow' },
  'profile.following': { ar: 'متابع', en: 'Following' },
  'profile.unfollow': { ar: 'إلغاء المتابعة', en: 'Unfollow' },
  'profile.joined': { ar: 'انضم في', en: 'Joined' },
  'profile.voices': { ar: 'صدى', en: 'Voices' },
  'profile.followers': { ar: 'متابع', en: 'Followers' },
  'profile.followingCount': { ar: 'يتابع', en: 'Following' },
  'profile.myVoices': { ar: 'صدى صوتك', en: 'My Voices' },
  'profile.userVoices': { ar: 'الأصداء', en: 'Voices' },
  'profile.notFound': { ar: 'المستخدم غير موجود', en: 'User not found' },
  'profile.backToMine': { ar: 'العودة لملفي', en: 'Back to My Profile' },
  'profile.noVoices': {
    ar: 'لسه ما سجلتش صدى. ابدأ أول تسجيل!',
    en: 'No voices yet. Start your first recording!'
  },
  'profile.noVoicesOther': {
    ar: 'هذا المستخدم لسه ما سجلش صدى',
    en: 'This user hasn\'t recorded any voices yet'
  },

  // === Settings ===
  'settings.title': { ar: 'الإعدادات', en: 'Settings' },
  'settings.subtitle': { ar: 'تعديل حسابك وإدارة خصوصيتك', en: 'Edit your account and manage privacy' },
  'settings.name': { ar: 'الاسم', en: 'Name' },
  'settings.bio': { ar: 'النبذة', en: 'Bio' },
  'settings.bioPlaceholder': { ar: 'اكتب نبذة قصيرة عنك...', en: 'Write a short bio...' },
  'settings.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'settings.avatar': { ar: 'صورة البروفايل', en: 'Profile Picture' },
  'settings.changeAvatar': { ar: 'تغيير الصورة', en: 'Change Picture' },
  'settings.removeAvatar': { ar: 'إزالة الصورة', en: 'Remove Picture' },
  'settings.appearance': { ar: 'المظهر', en: 'Appearance' },
  'settings.theme': { ar: 'الثيم', en: 'Theme' },
  'settings.darkMode': { ar: 'الوضع الداكن', en: 'Dark Mode' },
  'settings.lightMode': { ar: 'الوضع الفاتح', en: 'Light Mode' },
  'settings.language': { ar: 'اللغة', en: 'Language' },
  'settings.arabic': { ar: 'العربية', en: 'Arabic' },
  'settings.english': { ar: 'English', en: 'English' },
  'settings.save': { ar: 'حفظ التغييرات', en: 'Save Changes' },
  'settings.saving': { ar: 'جاري الحفظ...', en: 'Saving...' },
  'settings.saved': { ar: 'تم حفظ التغييرات', en: 'Changes saved' },
  'settings.support': { ar: 'ادعم صدى', en: 'Support Sada' },
  'settings.logout': { ar: 'تسجيل الخروج', en: 'Logout' },
  'settings.deleteAccount': { ar: 'حذف الحساب نهائياً', en: 'Delete Account Permanently' },
  'settings.version': { ar: 'صدى · الإصدار', en: 'Sada · Version' },
  'settings.security': { ar: 'الأمان', en: 'Security' },
  'settings.changePassword': { ar: 'تغيير كلمة المرور', en: 'Change Password' },

  // === Password Reset ===
  'reset.title': { ar: 'نسيت كلمة المرور', en: 'Forgot Password' },
  'reset.subtitle': {
    ar: 'ادخل إيميلك وهنبعتلك كود تحقق',
    en: 'Enter your email and we\'ll send you a verification code'
  },
  'reset.sendCode': { ar: 'إرسال الكود', en: 'Send Code' },
  'reset.codeSent': { ar: 'تم إرسال الكود لإيميلك', en: 'Code sent to your email' },
  'reset.enterCode': { ar: 'ادخل الكود', en: 'Enter Code' },
  'reset.codePlaceholder': { ar: 'الكود المكون من 6 أرقام', en: '6-digit code' },
  'reset.verify': { ar: 'تحقق', en: 'Verify' },
  'reset.newPassword': { ar: 'كلمة المرور الجديدة', en: 'New Password' },
  'reset.confirmPassword': { ar: 'تأكيد كلمة المرور', en: 'Confirm Password' },
  'reset.changePassword': { ar: 'تغيير كلمة المرور', en: 'Change Password' },
  'reset.passwordChanged': { ar: 'تم تغيير كلمة المرور بنجاح', en: 'Password changed successfully' },
  'reset.invalidCode': { ar: 'كود غير صحيح', en: 'Invalid code' },
  'reset.expiredCode': { ar: 'الكود انتهت صلاحيته', en: 'Code expired' },
  'reset.passwordMismatch': { ar: 'كلمتا المرور غير متطابقتين', en: 'Passwords don\'t match' },
  'reset.backToLogin': { ar: 'العودة لتسجيل الدخول', en: 'Back to Login' },
  'reset.resendCode': { ar: 'إعادة إرسال الكود', en: 'Resend Code' },

  // === Search ===
  'search.title': { ar: 'بحث', en: 'Search' },
  'search.placeholder': { ar: 'بحث عن أشخاص أو أصداء...', en: 'Search people or voices...' },
  'search.noResults': { ar: 'مفيش نتائج', en: 'No results' },
  'search.people': { ar: 'أشخاص', en: 'People' },
  'search.voices': { ar: 'أصداء', en: 'Voices' },
  'search.startTyping': { ar: 'اكتب اسم أو كلمة للبحث في صدى', en: 'Type a name or word to search Sada' },

  // === Support Modal ===
  'support.title': { ar: 'ادعم تطوير صدى', en: 'Support Sada' },
  'support.subtitle': {
    ar: 'صدى مجانية وبلا إعلانات. دعمك يساعد في تغطية تكاليف السيرفر والتطوير المستمر.',
    en: 'Sada is free and ad-free. Your support helps cover server costs and ongoing development.'
  },
  'support.amount': { ar: 'المبلغ (USD)', en: 'Amount (USD)' },
  'support.name': { ar: 'الاسم', en: 'Name' },
  'support.email': { ar: 'البريد (اختياري)', en: 'Email (optional)' },
  'support.message': { ar: 'رسالة (اختياري)', en: 'Message (optional)' },
  'support.messagePlaceholder': {
    ar: 'كلمة حلوة لصاحب المشروع 🌟',
    en: 'A kind word for the creator 🌟'
  },
  'support.chooseMethod': { ar: 'اختر طريقة الدفع:', en: 'Choose payment method:' },
  'support.totalDonations': { ar: 'إجمالي دعمكم لصدى', en: 'Total Community Support' },
  'support.supporters': { ar: 'داعم', en: 'supporters' },
  'support.thankYou': { ar: 'كل دولار بيفرق. شكراً إنك هنا.', en: 'Every dollar counts. Thank you for being here.' },

  // === Delete Account ===
  'delete.title': { ar: 'حذف الحساب نهائياً؟', en: 'Delete Account Permanently?' },
  'delete.warning': {
    ar: 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف:',
    en: 'This action cannot be undone. This will delete:'
  },
  'delete.item1': { ar: 'كل تسجيلاتك الصوتية', en: 'All your voice recordings' },
  'delete.item2': { ar: 'كل تعليقاتك وإعجاباتك', en: 'All your comments and likes' },
  'delete.item3': { ar: 'متابعيك ومتابَعيك', en: 'Your followers and following' },
  'delete.item4': { ar: 'بيانات حسابك الشخصية', en: 'Your account data' },
  'delete.confirm': { ar: 'للتأكيد، اكتب', en: 'To confirm, type' },
  'delete.confirmBtn': { ar: 'حذف نهائي', en: 'Delete Permanently' },
  'delete.deleting': { ar: 'جاري الحذف...', en: 'Deleting...' },
  'delete.deleted': { ar: 'تم حذف حسابك. نشوفك قريب 🙏', en: 'Account deleted. See you soon 🙏' },

  // === Report ===
  'report.title': { ar: 'الإبلاغ عن المحتوى', en: 'Report Content' },
  'report.subtitle': {
    ar: 'صدى مكان للحوار الهادئ. لو شفت إساءة لدين أو سياسة أو إهانة، بلّغنا وهنراجعه فوراً.',
    en: 'Sada is for calm dialogue. If you see religious mockery, politics, or insults, report it and we\'ll review immediately.'
  },
  'report.religion': { ar: 'إساءة للأديان', en: 'Religious Offense' },
  'report.religionDesc': { ar: 'سخرية أو إساءة لمعتقد ديني', en: 'Mockery or offense to religious beliefs' },
  'report.politics': { ar: 'محتوى سياسي مسيء', en: 'Offensive Political Content' },
  'report.politicsDesc': { ar: 'تحريض أو سخرية سياسية', en: 'Political incitement or mockery' },
  'report.insult': { ar: 'إهانة أو شتائم', en: 'Insults or Swearing' },
  'report.insultDesc': { ar: 'إساءة شخصية أو لفظ نابٍ', en: 'Personal insults or profanity' },
  'report.spam': { ar: 'سبام أو تكرار', en: 'Spam or Repetition' },
  'report.spamDesc': { ar: 'محتوى متكرر أو إعلاني', en: 'Repeated or promotional content' },
  'report.other': { ar: 'سبب آخر', en: 'Other' },
  'report.otherDesc': { ar: 'شيء غير ما سبق', en: 'Something else' },
  'report.commentPlaceholder': { ar: 'تفاصيل إضافية (اختياري)', en: 'Additional details (optional)' },
  'report.submit': { ar: 'إرسال البلاغ', en: 'Submit Report' },
  'report.submitting': { ar: 'جاري الإرسال...', en: 'Submitting...' },
  'report.success': { ar: 'وصل البلاغ، شكراً لمساعدتنا نحافظ على صدى نظيفة', en: 'Report received. Thank you for helping keep Sada clean' },
  'report.alreadyReported': { ar: 'بلّغت عن هذا المحتوى من قبل', en: 'You already reported this content' },

  // === Errors ===
  'error.network': { ar: 'مفيش نتال، حاول مرة تانية', en: 'No network, try again' },
  'error.unknown': { ar: 'حدث خطأ، حاول مرة تانية', en: 'An error occurred, try again' },
  'error.unauthorized': { ar: 'غير مسموح', en: 'Unauthorized' },
  'error.notFound': { ar: 'غير موجود', en: 'Not found' },
  'error.rateLimited': { ar: 'تم تجاوز الحد المسموح. حاول تاني بعد شوية.', en: 'Rate limit exceeded. Try again later.' },
  'error.invalidAudio': { ar: 'تسجيل صوتي غير صالح', en: 'Invalid audio recording' },
  'error.fileTooLarge': { ar: 'حجم الملف كبير جداً', en: 'File too large' },
  'error.loginRequired': { ar: 'سجّل دخولك الأول', en: 'Login first' },

  // === Follow List ===
  'followList.followers': { ar: 'المتابعون', en: 'Followers' },
  'followList.following': { ar: 'يتابعهم', en: 'Following' },
  'followList.empty.followers': { ar: 'مفيش متابعين لسه', en: 'No followers yet' },
  'followList.empty.following': { ar: 'مش بيتابع حد لسه', en: 'Not following anyone yet' },

  // === Misc ===
  'misc.now': { ar: 'الآن', en: 'now' },
  'misc.close': { ar: 'إغلاق', en: 'Close' },
  'misc.optional': { ar: 'اختياري', en: 'optional' },
  'misc.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
}

/**
 * Get translation for a key
 */
export function t(key: string, lang: Language = 'ar'): string {
  const entry = translations[key]
  if (!entry) return key
  return entry[lang] || entry.ar
}

/**
 * Detect language from user preference or browser
 */
export function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'ar'
  
  // Check localStorage
  const stored = localStorage.getItem('sada-language')
  if (stored === 'en' || stored === 'ar') return stored
  
  // Check browser language
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('en')) return 'en'
  
  return 'ar'
}

/**
 * Set language preference
 */
export function setLanguage(lang: Language) {
  if (typeof window === 'undefined') return
  localStorage.setItem('sada-language', lang)
  
  // Update HTML dir and lang
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

/**
 * Get theme from storage or default
 */
export function getTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('sada-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

/**
 * Set theme preference
 */
export function setTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return
  localStorage.setItem('sada-theme', theme)
  
  if (theme === 'light') {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
  }
}
