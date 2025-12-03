import { HddOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Typography,
  message,
  theme,
} from "antd";
import { useEffect, useState } from "react";
import { login, register } from "../../services/auth";
import { useAuthStore } from "../../store/auth";
import styles from "./index.module.less";

const { Title, Text } = Typography;

const REMEMBER_ME_KEY = "soundx_remember_credentials";

interface RememberedCredentials {
  username: string;
  password: string;
}

const LoginModal = () => {
  const { token, login: setLogin } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginForm] = Form.useForm();
  const { token: themeToken } = theme.useToken();

  // Load saved credentials on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem(REMEMBER_ME_KEY);
    if (savedCredentials) {
      try {
        const { username, password }: RememberedCredentials =
          JSON.parse(savedCredentials);
        loginForm.setFieldsValue({ username, password });
        setRememberMe(true);
      } catch (error) {
        console.error("Failed to load saved credentials:", error);
      }
    }
  }, [loginForm]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    localStorage.setItem("serverAddress", values.serverAddress);
    try {
      if (isLogin) {
        const res = await login({
          username: values.username,
          password: values.password,
        });
        if (res.data) {
          setLogin(res.data.token, res.data);
          localStorage.setItem("token", res.data.token);
          message.success("登录成功");

          // Save or clear credentials based on rememberMe
          if (rememberMe) {
            const credentials: RememberedCredentials = {
              username: values.username,
              password: values.password,
            };
            localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(credentials));
          } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
          }
        }
      } else {
        const res = await register({
          username: values.username,
          password: values.password,
        });
        if (res.data) {
          localStorage.setItem("token", res.data.token);
          setLogin(res.data.token, res.data);
          message.success("注册成功");
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={!token}
      footer={null}
      closable={false}
      maskClosable={false}
      mask={false}
      centered
      width={420}
      className={styles.loginModal}
    >
      <div className={styles.header}>
        <Title
          level={2}
          className={styles.title}
          style={{ color: themeToken.colorText }}
        >
          {isLogin ? "Login" : "Sign Up"}
        </Title>
        <Text
          className={styles.subtitle}
          style={{ color: themeToken.colorTextSecondary }}
        >
          {isLogin ? "欢迎回来" : "创建一个新账户开始"}
        </Text>
      </div>

      <Form
        form={loginForm}
        layout="vertical"
        size="large"
        className={styles.form}
      >
        <Form.Item
          name="serverAddress"
          rules={[
            { required: true, message: "请输入服务端地址" },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (
                  value.startsWith("http://") ||
                  value.startsWith("https://")
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("服务端地址必须以 http:// 或 https:// 开头")
                );
              },
            },
          ]}
        >
          <Input prefix={<HddOutlined />} placeholder="请输入服务端地址" />
        </Form.Item>
        {isLogin ? (
          <>
            <Form.Item
              name="username"
              rules={[{ required: true, message: "请输入用户名!" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: "请输入密码!" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 16 }}>
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ color: themeToken.colorTextSecondary }}
              >
                Remember me
              </Checkbox>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                onClick={async () => {
                  const values = await loginForm.validateFields();
                  handleFinish(values);
                }}
                block
                loading={loading}
                className={styles.submitButton}
              >
                Login
              </Button>
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              name="username"
              rules={[{ required: true, message: "请输入用户名!" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="User Name" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: "请输入密码!" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
              />
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
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                onClick={async () => {
                  const values = await loginForm.validateFields();
                  handleFinish(values);
                }}
                block
                loading={loading}
                className={styles.submitButton}
              >
                Sign Up
              </Button>
            </Form.Item>
          </>
        )}
      </Form>

      <div
        className={styles.switchText}
        style={{ color: themeToken.colorTextSecondary }}
      >
        {isLogin ? (
          <>
            Don't have an account?{" "}
            <span
              className={styles.switchLink}
              onClick={() => setIsLogin(false)}
              style={{ color: themeToken.colorPrimary }}
            >
              Signup
            </span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span
              className={styles.switchLink}
              onClick={() => setIsLogin(true)}
              style={{ color: themeToken.colorPrimary }}
            >
              Login
            </span>
          </>
        )}
      </div>

      <div
        className={styles.footer}
        style={{ color: themeToken.colorTextTertiary }}
      >
        Created by SoundX
      </div>
    </Modal>
  );
};

export default LoginModal;
