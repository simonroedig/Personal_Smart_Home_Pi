
#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# just a script that informs me daily about new thesis topics at LMU Munich via email

# ---------------- Configuration ----------------
URL = "https://www.medien.ifi.lmu.de/studierende/abschlussarbeiten/themen/index.xhtml-php?type=ma"
LOCAL_FILE = "last_thesis_titles.txt"

EMAIL_FROM = "simon.ma..."   # Gmail sender - replace obviously
EMAIL_PASSWORD = "ivg..."           # 16-char Gmail App Password - replace obviously
EMAIL_TO = "simo.."           # Receiving web.de email - replace obviously

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
# ------------------------------------------------

def send_email(all_titles, new_titles):
    if new_titles:
        header_text = "🚨 New thesis topics detected!"
    else:
        header_text = "✅ No new thesis topics today"

    html_body = f"<h2>{header_text}</h2><ul>"

    for t in all_titles:
        if t in new_titles:
            html_body += f"<li style='background-color: #ffff99; font-weight:bold;'>{t}</li>"
        else:
            html_body += f"<li>{t}</li>"

    html_body += "</ul>"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "LMU Thesis Topics Update"
    msg["From"] = EMAIL_FROM
    msg["To"] = EMAIL_TO

    msg.attach(MIMEText(html_body, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_FROM, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print("Email sent successfully!")
    except Exception as e:
        print("Error sending email:", e)

def get_current_titles():
    r = requests.get(URL)
    soup = BeautifulSoup(r.text, "html.parser")
    titles = [tag.get_text(strip=True) for tag in soup.find_all("div", class_="thesistitle")]
    return titles

def load_previous_titles():
    if not os.path.exists(LOCAL_FILE):
        return []
    with open(LOCAL_FILE, "r") as f:
        return [line.strip() for line in f.readlines()]

def save_titles(titles):
    with open(LOCAL_FILE, "w") as f:
        for t in titles:
            f.write(t + "\n")

def main():
    current = get_current_titles()
    previous = load_previous_titles()

    if not previous:
        save_titles(current)
        send_email(current, [])
        print("Initial email sent with all current thesis topics.")
        return

    new_titles = [t for t in current if t not in previous]

    send_email(current, new_titles)
    save_titles(current)

if __name__ == "__main__":
    main()
