import torch.nn as nn
from torchvision import models


def build_model(num_classes: int, pretrained: bool = False) -> nn.Module:
    """MobileNetV2 (transfer learning dari ImageNet) dengan kepala klasifikasi baru."""
    weights = models.MobileNet_V2_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.mobilenet_v2(weights=weights)
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(model.last_channel, num_classes),
    )
    return model
