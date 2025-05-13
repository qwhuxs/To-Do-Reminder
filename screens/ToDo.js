import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import AddTask from "../components/AddTask";
import TasksList from "../components/TasksList";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import moment from "moment-timezone";

const ToDo = () => {
  const [tasks, setTasks] = useState([]);

  const APP_ID = Constants.expoConfig.extra.oneSignalAppId;
  const API_KEY = Constants.expoConfig.extra.oneSignalApiKey;

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem("tasks");
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks);
        parsedTasks.sort((a, b) => a.date - b.date);
        setTasks(parsedTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAddTask = async (task) => {
    const notificationId = await sendNotification(task);

    if (notificationId) {
      task.id = notificationId;
      const updatedTasks = [task, ...tasks].sort((a, b) => a.date - b.date);

      setTasks(updatedTasks);
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
    } else {
      alert("Error sending notification. Please try again.");
    }
  };

  const toggleTaskFinished = async (id) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, isFinished: !task.isFinished } : task
    );
    setTasks(updatedTasks);
    await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const handleDeleteTask = async (id) => {
    const taskToDelete = tasks.find((task) => task.id === id);
    if (taskToDelete && !taskToDelete.isFinished) {
      try {
        await cancelNotification(taskToDelete.id);
      } catch (error) {
        console.warn("Failed to cancel notification:", error);
      }
    }

    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const cancelNotification = async (notificationId) => {
    try {
      const response = await fetch(
        `https://api.onesignal.com/notifications/${notificationId}?app_id=${APP_ID}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${API_KEY}`,
          },
        }
      );
      const data = await response.json();
      return data.errors ? false : true;
    } catch (error) {
      console.error("Error canceling notification:", error);
      return false;
    }
  };

  const getCurrentUserId = async () => {
    return await AsyncStorage.getItem("externalId");
  };

  const sendNotification = async (task) => {
    try {
      const externalUserId = await getCurrentUserId();
      console.log("externalUserId:", externalUserId);

      if (!externalUserId) {
        console.error("No externalUserId found in AsyncStorage");
        return false;
      }

      const taskDate =
        typeof task.date === "number"
          ? task.date
          : new Date(task.date).getTime();

      const localDate = moment.tz(taskDate, "Europe/Kiev").toDate();

      console.log("Task date (timestamp):", taskDate);
      console.log("Local date (Europe/Kiev):", localDate);
      console.log("Now:", new Date());

      if (localDate <= new Date()) {
        console.warn("Task date is in the past. Cannot schedule notification.");
        alert(
          "Неможливо запланувати нагадування в минулому. Оберіть майбутню дату та час."
        );
        return false;
      }

      const response = await fetch(
        "https://onesignal.com/api/v1/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Basic ${API_KEY}`,
          },
          body: JSON.stringify({
            app_id: APP_ID,
            include_external_user_ids: [externalUserId],
            headings: { en: task.name },
            contents: { en: task.description },
            send_after: localDate.toISOString(),
          }),
        }
      );

      const data = await response.json();
      console.log("OneSignal response:", data);

      if (data.errors) {
        console.error("OneSignal errors:", data.errors);
        return false;
      }

      return data.id;
    } catch (error) {
      console.error("Error sending notification:", error);
      return false;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>To-Do Reminder</Text>
      <AddTask onAddTask={handleAddTask} />
      <TasksList
        tasks={tasks}
        onDelete={handleDeleteTask}
        onToggleFinished={toggleTaskFinished}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F9FAFB", 
  },
  header: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "700",
    marginVertical: 20,
    color: "#111827", 
  },
  inputContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    color: "#111827",
  },
  datePicker: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  addButton: {
    backgroundColor: "#3B82F6", 
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  taskDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  taskDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  deleteButton: {
    marginLeft: 12,
    backgroundColor: "#EF4444", 
    padding: 10,
    borderRadius: 10,
  },
});


export default ToDo;
