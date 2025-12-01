import { LockOutlined, UserOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  Modal,
  Tabs,
  Typography,
  message,
  theme,
} from "antd";
import { useState } from "react";
import { login, register } from "../../services/auth";
import { useAuthStore } from "../../store/auth";

const { Title } = Typography;

const LoginModal = () => {
  const { token, login: setLogin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { token: themeToken } = theme.useToken();

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      if (activeTab === "login") {
        const res = await login({
          username: values.username,
          password: values.password,
        });
        if (res.data) {
          setLogin(res.data.token, res.data);
          message.success("登录成功");
        }
      } else {
        const res = await register({
          username: values.username,
          password: values.password,
        });
        if (res.data) {
          // Auto login after register or switch to login
          setLogin(res.data.token, res.data);
          message.success("注册成功");
        }
      }
    } catch (error) {
      console.error(error);
      // Error handling is usually done in request interceptor, but we can add specific handling here
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: "login",
      label: "登录",
      children: (
        <Form
          form={form}
          name="login"
          onFinish={handleFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              onClick={() => form.submit()}
              block
              loading={loading}
              style={{ marginTop: 16 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "register",
      label: "注册",
      children: (
        <Form
          form={form}
          name="register"
          onFinish={handleFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item
            name="confirm"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请确认密码!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致!"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              onClick={() => form.submit()}
              block
              loading={loading}
              style={{ marginTop: 16 }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <Modal
      open={!token}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
      width={400}
      styles={{
        content: {
          padding: "32px 24px",
          borderRadius: 16,
          backgroundColor: themeToken.colorBgElevated,
        },
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          SoundX
        </Title>
        <Typography.Text type="secondary">
          {activeTab === "login" ? "欢迎回来" : "创建新账户"}
        </Typography.Text>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "login" | "register")}
        items={items}
        centered
        tabBarStyle={{ marginBottom: 24 }}
      />
    </Modal>
  );
};

export default LoginModal;
