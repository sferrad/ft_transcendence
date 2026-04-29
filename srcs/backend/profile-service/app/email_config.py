import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


async def _send_email(to: str, subject: str, html_body: str):
    """Envoie un email via le serveur SMTP configuré (MailHog en dev)."""

    msg = MIMEMultipart("alternative")
    msg["From"] = os.getenv("MAIL_FROM", "noreply@transcendence.local")
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    hostname = os.getenv("MAIL_SERVER", "mailhog")
    port = int(os.getenv("MAIL_PORT", 1025))
    use_tls = os.getenv("MAIL_USE_TLS", "false").lower() == "true"
    username = os.getenv("MAIL_USERNAME", "") or None
    password = os.getenv("MAIL_PASSWORD", "") or None

    # MailHog n'a besoin ni de TLS ni de credentials
    kwargs = {
        "hostname": hostname,
        "port": port,
    }

    if use_tls:
        kwargs["start_tls"] = True
    if username and password:
        kwargs["username"] = username
        kwargs["password"] = password

    await aiosmtplib.send(msg, **kwargs)


async def send_deletion_request_confirmation(email_to: str, username: str):
    """Email 1 : AVANT la suppression."""

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; 
                    border-radius: 8px; padding: 30px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #d32f2f;">⚠️ Demande de suppression de compte</h2>
            <p>Bonjour <strong>{username}</strong>,</p>
            <p>Nous avons bien reçu votre demande de suppression de compte 
            et de toutes vos données personnelles.</p>
            <p>Cette opération est en cours de traitement. Vous recevrez 
            un <strong>email de confirmation</strong> une fois la suppression 
            effectuée.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
                Si vous n'êtes pas à l'origine de cette demande, 
                contactez-nous immédiatement.<br>
                RGPD - Article 17 : Droit à l'effacement
            </p>
        </div>
    </body>
    </html>
    """
    await _send_email(
        to=email_to,
        subject="[Transcendence] 🔔 Demande de suppression de compte reçue",
        html_body=html_body,
    )


async def send_deletion_confirmation(email_to: str, username: str, payload: dict):
    """Email 2 : APRÈS la suppression complète."""

    def status_icon(section_key: str) -> str:
        section = payload.get(section_key, {})
        if isinstance(section, dict) and section.get("ok"):
            return "✅ Supprimé"
        return "⚠️ Erreur"

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; 
                    border-radius: 8px; padding: 30px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #2e7d32;">✅ Compte supprimé avec succès</h2>
            <p>Bonjour <strong>{username}</strong>,</p>
            <p>Nous vous confirmons que votre compte et <strong>toutes vos 
            données personnelles</strong> ont été définitivement supprimés 
            conformément à votre demande.</p>

            <h3 style="color: #333;">📋 Résumé des opérations</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd;">Profil & Avatar</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{status_icon("profile_service")}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Compte utilisateur</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{"✅ Supprimé" if payload.get("user_service") else "⚠️ Erreur"}</td>
                </tr>
                <tr style="background: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd;">Liste d'amis</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{status_icon("friends_cleanup")}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Historique de chat</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{status_icon("chat_cleanup")}</td>
                </tr>
                <tr style="background: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd;">Historique de jeux</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{status_icon("game_cleanup")}</td>
                </tr>
            </table>

            <div style="background: #fff3e0; border-left: 4px solid #ff9800; 
                        padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>⚠️ Cette action est irréversible.</strong><br>
                Aucune donnée ne peut être récupérée après cette opération.
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
                📅 Date de suppression : {payload.get("deleted_at", "N/A")}<br>
                📧 Cet email a été envoyé automatiquement - ne pas répondre.<br>
                RGPD - Article 17 : Droit à l'effacement
            </p>
        </div>
    </body>
    </html>
    """
    await _send_email(
        to=email_to,
        subject="[Transcendence] ✅ Votre compte a été supprimé",
        html_body=html_body,
    )


async def send_data_export_confirmation(email_to: str, username: str):
    """Email optionnel : confirmation d'export de données RGPD."""

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; 
                    border-radius: 8px; padding: 30px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1565c0;">📦 Export de vos données</h2>
            <p>Bonjour <strong>{username}</strong>,</p>
            <p>Votre demande d'export de données personnelles a été traitée 
            avec succès (RGPD - Article 20 : Droit à la portabilité).</p>
            <p>Vos données vous ont été transmises au format JSON.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
                Cet email a été envoyé automatiquement - ne pas répondre.
            </p>
        </div>
    </body>
    </html>
    """
    await _send_email(
        to=email_to,
        subject="[Transcendence] 📦 Export de vos données personnelles",
        html_body=html_body,
    )
