from rich.console import Console
from rich.panel import Panel
from rich.align import Align
from bidi.algorithm import get_display # <--- הייבוא הקריטי

console = Console()

def fix_text(text):
    """
    פונקציה שמקבלת טקסט, הופכת את האותיות לתצוגה ויזואלית
    ומחזירה אותו מוכן להדפסה
    """
    return get_display(text)

# --- הבדיקה ---

# דוגמה 1: טקסט פשוט
# אנחנו מעבירים את הטקסט דרך fix_text כדי לסדר את האותיות
msg = fix_text("שלום עולם! האם זה עובד עכשיו?")
console.print(Align.right(msg)) # Align.right מצמיד את הבלוק ימינה

console.print("\n") # רווח

# דוגמה 2: בתוך פאנל מעוצב
# שים לב: אנחנו מתקנים את הטקסט לפני שאנחנו מכניסים אותו לפאנל
title = fix_text("בדיקת מערכת")
content = fix_text("הסוכן Gemini מחובר.\nכל המערכות תקינות.")

panel = Panel(
    Align.right(content), 
    title=title,
    border_style="green",
    padding=(1, 2)
)

console.print(panel)