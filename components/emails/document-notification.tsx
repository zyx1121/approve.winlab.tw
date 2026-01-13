import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface DocumentNotificationEmailProps {
  signerName: string;
  documentTitle: string;
  documentUrl: string;
  creatorName: string;
}

export const DocumentNotificationEmail = ({
  signerName = "使用者",
  documentTitle = "文件標題",
  documentUrl = "https://approve.winlab.tw",
  creatorName = "系統管理員",
}: DocumentNotificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>您有一份文件待簽核 - {documentTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>
            Hi <strong>{signerName}</strong>，
          </Text>
          <Text style={text}>
            <strong>{creatorName}</strong> 建立了一份文件需要您簽核：
          </Text>
          <Section style={documentSection}>
            <Text style={documentTitleStyle}>{documentTitle}</Text>
          </Section>
          <Section style={buttonContainer}>
            <Button style={button} href={documentUrl}>
              立即簽核
            </Button>
          </Section>
          <Text style={text}>
            或複製以下連結到瀏覽器：
            <br />
            <a href={documentUrl} style={link}>
              {documentUrl}
            </a>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            此郵件由 Winlab 簽核系統自動發送，請勿回覆此信件。
            <br />© 2026 WinLab. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DocumentNotificationEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 48px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 48px",
};

const documentSection = {
  backgroundColor: "#f4f4f5",
  padding: "0 48px",
  margin: "32px 0",
};

const documentTitleStyle = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: "600",
  margin: "32px 0",
};

const buttonContainer = {
  padding: "0 48px",
  margin: "32px 0",
};

const button = {
  backgroundColor: "#0070f3",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const link = {
  color: "#0070f3",
  textDecoration: "none",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 48px",
};
