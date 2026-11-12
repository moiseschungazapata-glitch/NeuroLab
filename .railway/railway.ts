import { defineRailway, github, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const trainingData = volume("neurolab-training-data", {
    region: "us-west2",
    sizeMB: 2048,
  });

  const api = service("neurolab-api", {
    source: github("moiseschungazapata-glitch/NeuroLab", { branch: "main" }),
    healthcheck: "/api/v1/health",
    healthcheckTimeout: 300,
    replicas: 1,
    volumeMounts: {
      "/data": trainingData,
    },
    env: {
      NEUROLAB_TRAINING_DIR: "/data/training",
      TF_CPP_MIN_LOG_LEVEL: "2",
      CUDA_VISIBLE_DEVICES: "-1",
      OMP_NUM_THREADS: "2",
      PYTHONUNBUFFERED: "1",
    },
  });

  return project("NeuroLab", {
    resources: [api, trainingData],
  });
});
