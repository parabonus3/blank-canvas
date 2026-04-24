import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface RecoveryEmailProps {
  confirmation_url: string
}

export const RecoveryEmail = ({ confirmation_url }: RecoveryEmailProps) => (
  <Html>
    <Head />
    <Preview>Password Reset - TimeZoni</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://lezufzdmjbozpzskqglv.supabase.co/storage/v1/object/public/email-assets/logo.png?v=1"
            alt="TimeZoni"
            width="64"
            height="64"
            style={logo}
          />
          <Heading style={brand}>TimeZoni</Heading>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset your TimeZoni account password.
            Click the button below to create a new password:
          </Text>

          <Section style={buttonContainer}>
            <Link href={confirmation_url} target="_blank" style={button}>
              Reset Password
            </Link>
          </Section>

          <Text style={textMuted}>
            If you didn't request a password reset, you can safely ignore this email.
            The link expires in 1 hour.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} TimeZoni. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const logoSection = {
  textAlign: 'center' as const,
  padding: '32px 0 24px',
}

const logo = {
  margin: '0 auto',
  borderRadius: '12px',
}

const brand = {
  color: '#1e293b',
  fontSize: '20px',
  fontWeight: '700',
  margin: '12px 0 0',
  padding: '0',
}

const content = {
  padding: '0 32px',
}

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '32px 0 16px',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#334155',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const textMuted = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 0 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#0ea5e9',
  borderRadius: '12px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  lineHeight: '100%',
  padding: '14px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
}

const footer = {
  borderTop: '1px solid #e2e8f0',
  marginTop: '32px',
  paddingTop: '24px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
}
